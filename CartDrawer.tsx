import { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { CartItem } from '../types/store.ts';
import { FREE_DELIVERY_THRESHOLD_BDT, formatBDT } from '../utils/format.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  promoCode: string | null;
  promoDiscountBdt: number;
  onClose: () => void;
  onUpdateQty: (productId: string, variantId: string, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onApplyPromo: (code: string, discountBdt: number) => void;
  onClearPromo: () => void;
  onCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  promoCode,
  promoDiscountBdt,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onApplyPromo,
  onClearPromo,
  onCheckout,
}: CartDrawerProps) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const subtotalBdt = items.reduce((sum, item) => sum + item.priceBdt * item.quantity, 0);
  const netSubtotal = Math.max(0, subtotalBdt - promoDiscountBdt);
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD_BDT - netSubtotal);
  const freeProgress = Math.min(100, (netSubtotal / FREE_DELIVERY_THRESHOLD_BDT) * 100);

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = promoInput.trim().toUpperCase();
    if (!cleaned) return;
    setPromoError('');
    setPromoLoading(true);
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned, subtotalBdt }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.message || 'Promo code could not be applied.');
      } else {
        onApplyPromo(data.code, data.discountBdt);
        setPromoInput('');
      }
    } catch {
      setPromoError('Unable to verify promo code right now.');
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Bag"
          className="fixed inset-0 z-50 flex justify-end"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#141413]/50 backdrop-blur-xs"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-[#FAFAF8] h-full flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-[#141413]/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#0F523E]" aria-hidden="true" />
                <h2 className="font-display text-2xl font-semibold text-[#141413]">
                  Your Bag
                </h2>
                <span className="text-xs text-[#5C5B57] tabular-nums">
                  ({items.reduce((acc, i) => acc + i.quantity, 0)})
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close bag"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[#5C5B57] hover:text-[#141413] hover:bg-[#F2F1ED] transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Free Delivery Progress */}
            {items.length > 0 && (
              <div className="px-6 py-3 bg-[#F2F1ED] border-b border-[#141413]/8">
                <p className="text-xs text-[#141413] mb-1.5">
                  {remainingForFreeDelivery === 0 ? (
                    <span className="font-medium text-[#0F523E]">
                      Unlocked: Complimentary insured delivery across Bangladesh
                    </span>
                  ) : (
                    <span>
                      Add{' '}
                      <span className="font-semibold tabular-nums">
                        {formatBDT(remainingForFreeDelivery)}
                      </span>{' '}
                      more for free nationwide delivery
                    </span>
                  )}
                </p>
                <div className="h-1.5 w-full bg-[#141413]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0F523E] transition-all duration-300"
                    style={{ width: `${freeProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Item List */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <ShoppingBag className="w-10 h-10 text-[#5C5B57]/50 mb-3 stroke-[1.5]" aria-hidden="true" />
                  <p className="font-display text-2xl font-semibold text-[#141413] mb-1">
                    Your bag is empty
                  </p>
                  <p className="text-sm text-[#5C5B57] mb-6 max-w-xs">
                    Explore handcrafted apparel, leather goods, and studio audio essentials.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-[#0F523E] text-white text-sm font-medium rounded-lg hover:bg-[#0B3F30] transition-colors"
                  >
                    Browse Collection
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-4 p-3.5 bg-white rounded-xl border border-[#141413]/8"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#F2F1ED] shrink-0">
                      <ResilientImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#141413] truncate">
                            {item.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.productId, item.variantId)}
                            aria-label={`Remove ${item.name}`}
                            className="p-1 text-[#5C5B57] hover:text-red-700 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="text-xs text-[#5C5B57] truncate">{item.variantLabel}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="inline-flex items-center border border-[#141413]/12 rounded-md h-8">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.variantId, -1)}
                            aria-label="Decrease quantity"
                            className="w-7 h-full flex items-center justify-center text-[#141413] hover:bg-[#F2F1ED]"
                          >
                            <Minus className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <span className="w-7 text-center text-xs font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.variantId, 1)}
                            aria-label="Increase quantity"
                            className="w-7 h-full flex items-center justify-center text-[#141413] hover:bg-[#F2F1ED]"
                          >
                            <Plus className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold text-[#141413] tabular-nums">
                          {formatBDT(item.priceBdt * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Totals & Promo */}
            {items.length > 0 && (
              <div className="p-6 bg-white border-t border-[#141413]/10 space-y-4">
                {!promoCode ? (
                  <form onSubmit={handlePromoSubmit} className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag
                          className="w-3.5 h-3.5 text-[#5C5B57] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder="Promo code (e.g. HRIDOY10)"
                          className="w-full h-10 pl-8 pr-3 bg-[#FAFAF8] border border-[#141413]/12 rounded-lg text-xs text-[#141413] uppercase focus:outline-none focus:border-[#0F523E]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={promoLoading}
                        className="px-4 h-10 bg-[#F2F1ED] hover:bg-[#141413] hover:text-white text-xs font-medium text-[#141413] rounded-lg transition-colors whitespace-nowrap"
                      >
                        {promoLoading ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && <p className="text-xs text-red-700">{promoError}</p>}
                  </form>
                ) : (
                  <div className="flex items-center justify-between text-xs bg-[#0F523E]/8 text-[#0F523E] px-3 py-2 rounded-lg">
                    <span>
                      Code <span className="font-mono-tabular font-semibold">{promoCode}</span> applied
                    </span>
                    <button
                      type="button"
                      onClick={onClearPromo}
                      className="underline font-medium hover:text-[#141413]"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#5C5B57]">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatBDT(subtotalBdt)}</span>
                  </div>
                  {promoDiscountBdt > 0 && (
                    <div className="flex justify-between text-[#0F523E]">
                      <span>Promo Savings</span>
                      <span className="tabular-nums">−{formatBDT(promoDiscountBdt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5C5B57] text-xs">
                    <span>Delivery</span>
                    <span>Calculated at checkout (Free over ৳5,000)</span>
                  </div>
                  <div className="pt-2 border-t border-[#141413]/10 flex justify-between font-semibold text-[#141413] text-base">
                    <span>Estimated Total</span>
                    <span className="tabular-nums">{formatBDT(netSubtotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCheckout}
                  className="w-full h-12 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
