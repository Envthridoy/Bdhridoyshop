import { useEffect, useState } from 'react';
import { Check, Package, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Order } from '../types/store.ts';
import { formatBDT } from '../utils/format.ts';

interface TrackOrderModalProps {
  isOpen: boolean;
  initialOrderCode: string | null;
  recentOrderCodes: string[];
  onClose: () => void;
}

export function TrackOrderModal({
  isOpen,
  initialOrderCode,
  recentOrderCodes,
  onClose,
}: TrackOrderModalProps) {
  const [queryCode, setQueryCode] = useState(initialOrderCode || 'BDH-1042');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const lookupOrder = async (codeToFetch: string) => {
    const cleaned = codeToFetch.trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setErrorMsg(data.error || 'Order not found.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setErrorMsg('Unable to reach order tracking desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const code = initialOrderCode || 'BDH-1042';
    setQueryCode(code);
    lookupOrder(code);
  }, [isOpen, initialOrderCode]);

  if (!isOpen) return null;

  const quickCodes = Array.from(new Set([...recentOrderCodes, 'BDH-1042', 'BDH-1038'])).slice(
    0,
    4,
  );

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Track Order"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#133475] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#5CC8F5]" aria-hidden="true" />
              <h2 className="text-base font-bold">Track Your Bangladesh Parcel</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order tracker"
              className="p-1.5 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupOrder(queryCode);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={queryCode}
                  onChange={(e) => setQueryCode(e.target.value)}
                  placeholder="Enter Order ID (e.g. BDH-1042)"
                  className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono-tabular uppercase focus:outline-none focus:border-[#133475]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 h-11 bg-[#E11D2E] hover:bg-[#C41423] text-white text-xs font-bold rounded-lg transition-colors"
              >
                {loading ? 'Checking...' : 'Track Order'}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Quick lookup:</span>
              {quickCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setQueryCode(code);
                    lookupOrder(code);
                  }}
                  className="font-mono-tabular font-semibold text-[#133475] underline hover:text-[#E11D2E]"
                >
                  {code}
                </button>
              ))}
            </div>

            {errorMsg && (
              <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 p-3 rounded-lg">
                {errorMsg}
              </p>
            )}

            {order && (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs font-mono-tabular font-bold text-[#E11D2E]">
                      ORDER #{order.orderCode}
                    </p>
                    <h3 className="text-base font-bold text-[#133475]">
                      {order.customer.fullName} · {order.customer.district}
                    </h3>
                    <p className="text-xs text-slate-500">{order.customer.areaAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-[#133475] tabular-nums">
                      {formatBDT(order.pricing.totalBdt)}
                    </p>
                    <p className="text-xs text-slate-500">{order.payment.statusLabel}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {order.timeline.map((step) => (
                    <div key={step.stage} className="flex sm:flex-col gap-3 sm:gap-1.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                          step.completed
                            ? 'bg-[#133475] border-[#133475] text-white'
                            : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold ${
                            step.completed ? 'text-[#133475]' : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
