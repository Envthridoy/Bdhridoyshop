import { useState } from 'react';
import { Check, CheckCircle2, Copy, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { CartItem, Order, PaymentMethod, SiteSettings } from '../types/store.ts';
import {
  BANGLADESH_DIVISIONS,
  DELIVERY_ZONES,
  calculateDeliveryFee,
  formatBDT,
  inferZoneFromDistrict,
  isValidBdPhone,
} from '../utils/format.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  promoCode: string | null;
  promoDiscountBdt: number;
  siteSettings: SiteSettings;
  refResellerCode?: string | null;
  onClose: () => void;
  onOrderConfirmed: (order: Order) => void;
  onTrackNewOrder: (orderCode: string) => void;
}

export function CheckoutModal({
  isOpen,
  items,
  promoCode,
  promoDiscountBdt,
  siteSettings,
  refResellerCode,
  onClose,
  onOrderConfirmed,
  onTrackNewOrder,
}: CheckoutModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka Metro');
  const [areaAddress, setAreaAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [trxId, setTrxId] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const selectedDivisionObj =
    BANGLADESH_DIVISIONS.find((d) => d.division === division) ?? BANGLADESH_DIVISIONS[0];

  const zone = inferZoneFromDistrict(division, district);
  const zoneMeta = DELIVERY_ZONES[zone];
  const subtotalBdt = items.reduce((sum, item) => sum + item.priceBdt * item.quantity, 0);
  const netSubtotal = Math.max(0, subtotalBdt - promoDiscountBdt);
  const deliveryFeeBdt = calculateDeliveryFee(netSubtotal, zone);
  const grandTotalBdt = netSubtotal + deliveryFeeBdt;

  const handleDivisionChange = (newDiv: string) => {
    setDivision(newDiv);
    const found = BANGLADESH_DIVISIONS.find((d) => d.division === newDiv);
    if (found && found.districts.length > 0) {
      setDistrict(found.districts[0]);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter recipient full name.');
      return;
    }
    if (!isValidBdPhone(phone)) {
      setErrorMsg('Enter a valid 11-digit Bangladesh mobile number (e.g. 01711223344).');
      return;
    }
    if (!areaAddress.trim()) {
      setErrorMsg('Please enter your house, road, and area details.');
      return;
    }
    if (
      (paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'rocket') &&
      trxId.trim().length < 5
    ) {
      const label =
        paymentMethod === 'bkash' ? 'bKash' : paymentMethod === 'nagad' ? 'Nagad' : 'Rocket';
      setErrorMsg(`Please enter your ${label} Transaction ID (TrxID).`);
      return;
    }
    if (paymentMethod === 'card') {
      if (!cardHolder.trim()) {
        setErrorMsg('Please enter cardholder name for Mastercard / Visa verification.');
        return;
      }
      if (!/^\d{4}$/.test(cardLast4.trim())) {
        setErrorMsg('Please enter the last 4 digits of your Mastercard / Visa card.');
        return;
      }
    }

    const paymentRef =
      paymentMethod === 'card'
        ? `**** ${cardLast4.trim()} · ${cardHolder.trim()}`
        : trxId.trim() || undefined;

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            division,
            district,
            areaAddress: areaAddress.trim(),
            zone,
          },
          payment: {
            method: paymentMethod,
            trxId: paymentRef,
          },
          promoCode: promoCode || undefined,
          resellerCode: refResellerCode || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            variantLabel: i.variantLabel,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not place order. Please review your details.');
      } else {
        setConfirmedOrder(data.order);
        onOrderConfirmed(data.order);
      }
    } catch {
      setErrorMsg('Network error placing order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setConfirmedOrder(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseModal}
          className="fixed inset-0 bg-[#141413]/55 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-4xl bg-[#FAFAF8] sm:rounded-2xl shadow-2xl overflow-hidden max-h-screen sm:max-h-[92vh] flex flex-col"
        >
          <div className="px-6 py-4 bg-white border-b border-[#141413]/10 flex items-center justify-between shrink-0">
            <h2 className="font-display text-2xl font-semibold text-[#141413]">
              {confirmedOrder ? 'Order Confirmed' : 'Bangladesh Express Checkout'}
            </h2>
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label="Close checkout"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[#5C5B57] hover:text-[#141413] hover:bg-[#F2F1ED]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 lg:p-8">
            {confirmedOrder ? (
              <div className="max-w-xl mx-auto py-4 space-y-6">
                <div className="flex items-start gap-4 p-5 rounded-xl bg-white border border-[#0F523E]/25">
                  <CheckCircle2
                    className="w-7 h-7 text-[#0F523E] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-mono-tabular font-semibold text-[#0F523E] mb-1">
                      ORDER #{confirmedOrder.orderCode}
                    </p>
                    <h3 className="font-display text-2xl font-semibold text-[#141413] mb-1">
                      Thank you, {confirmedOrder.customer.fullName}.
                    </h3>
                    <p className="text-sm text-[#5C5B57]">
                      Your parcel is confirmed for{' '}
                      <span className="font-medium text-[#141413]">
                        {confirmedOrder.customer.district}
                      </span>{' '}
                      ({confirmedOrder.estimatedDelivery}).
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-[#141413]/10 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5C5B57]">
                    Receipt Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    {confirmedOrder.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex justify-between gap-4"
                      >
                        <span className="text-[#141413]">
                          {item.name} ({item.variantLabel}) × {item.quantity}
                        </span>
                        <span className="font-medium tabular-nums shrink-0">
                          {formatBDT(item.priceBdt * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-[#141413]/10 space-y-1 text-xs text-[#5C5B57]">
                    <div className="flex justify-between">
                      <span>Shipping to</span>
                      <span className="text-[#141413] text-right">
                        {confirmedOrder.customer.areaAddress}, {confirmedOrder.customer.district}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment</span>
                      <span className="text-[#141413]">{confirmedOrder.payment.statusLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="tabular-nums text-[#141413]">
                        {confirmedOrder.pricing.deliveryFeeBdt === 0
                          ? 'Free'
                          : formatBDT(confirmedOrder.pricing.deliveryFeeBdt)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#141413]/10 flex justify-between text-sm font-semibold text-[#141413]">
                      <span>Total Amount</span>
                      <span className="tabular-nums">
                        {formatBDT(confirmedOrder.pricing.totalBdt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const code = confirmedOrder.orderCode;
                      handleCloseModal();
                      onTrackNewOrder(code);
                    }}
                    className="flex-1 h-12 px-5 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Track Order #{confirmedOrder.orderCode}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="h-12 px-5 bg-white border border-[#141413]/15 hover:border-[#141413]/35 text-sm font-medium text-[#141413] rounded-lg transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handlePlaceOrder}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Form */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-5 rounded-xl bg-white border border-[#141413]/10 space-y-4">
                    <h3 className="text-sm font-semibold text-[#141413]">
                      1. Delivery Address (Bangladesh)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#5C5B57] mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Tariqul Islam"
                          className="w-full h-11 px-3.5 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#0F523E]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#5C5B57] mb-1.5">
                          Mobile Number (+880)
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01711-223344"
                          className="w-full h-11 px-3.5 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] font-mono-tabular focus:outline-none focus:border-[#0F523E]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#5C5B57] mb-1.5">
                          Division
                        </label>
                        <select
                          value={division}
                          onChange={(e) => handleDivisionChange(e.target.value)}
                          className="w-full h-11 px-3.5 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#0F523E]"
                        >
                          {BANGLADESH_DIVISIONS.map((d) => (
                            <option key={d.division} value={d.division}>
                              {d.division}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#5C5B57] mb-1.5">
                          District / City
                        </label>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full h-11 px-3.5 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#0F523E]"
                        >
                          {selectedDivisionObj.districts.map((dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#5C5B57] mb-1.5">
                        Street Address, House & Area
                      </label>
                      <input
                        type="text"
                        required
                        value={areaAddress}
                        onChange={(e) => setAreaAddress(e.target.value)}
                        placeholder="e.g. House 14, Road 6, Dhanmondi / Agrabad"
                        className="w-full h-11 px-3.5 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#0F523E]"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 text-[#5C5B57]">
                      <span>Courier Tier: {zoneMeta.label}</span>
                      <span className="font-medium text-[#0F523E]">{zoneMeta.eta}</span>
                    </div>
                  </div>

                  {/* Payment Options */}
                  <div className="p-5 rounded-xl bg-white border border-[#141413]/10 space-y-4">
                    <h3 className="text-sm font-semibold text-[#141413]">
                      2. Payment Method
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'bkash' as PaymentMethod,
                          label: 'bKash',
                          sub: 'Instant Merchant / Send Money',
                          badgeText: 'bK',
                          badgeBg: 'bg-[#E2136E] text-white',
                        },
                        {
                          id: 'nagad' as PaymentMethod,
                          label: 'Nagad',
                          sub: 'Zero extra fee',
                          badgeText: 'NG',
                          badgeBg: 'bg-[#F6921E] text-white',
                        },
                        {
                          id: 'rocket' as PaymentMethod,
                          label: 'Rocket (DBBL)',
                          sub: 'DBBL Mobile Banking',
                          badgeText: 'RK',
                          badgeBg: 'bg-[#8C3494] text-white',
                        },
                        {
                          id: 'card' as PaymentMethod,
                          label: 'Mastercard / Visa',
                          sub: 'Debit & Credit Card',
                          badgeText: 'MC',
                          badgeBg: 'bg-[#133475] text-white',
                        },
                        {
                          id: 'cod' as PaymentMethod,
                          label: 'Cash on Delivery',
                          sub: 'Pay rider upon inspection',
                          badgeText: 'COD',
                          badgeBg: 'bg-[#0F523E] text-white',
                        },
                      ].map((opt) => {
                        const active = paymentMethod === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(opt.id);
                              setCopiedWallet(false);
                            }}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                              active
                                ? 'border-[#0F523E] bg-[#0F523E]/6 ring-1 ring-[#0F523E]/20'
                                : 'border-[#141413]/12 bg-[#FAFAF8] hover:border-[#141413]/30'
                            }`}
                          >
                            {opt.id === 'card' ? (
                              <span className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0" aria-hidden="true">
                                <svg viewBox="0 0 32 20" className="w-6 h-4">
                                  <circle cx="11" cy="10" r="7" fill="#EB001B" />
                                  <circle cx="21" cy="10" r="7" fill="#F79E1B" fillOpacity="0.9" />
                                </svg>
                              </span>
                            ) : (
                              <span
                                className={`w-9 h-9 rounded-lg ${opt.badgeBg} text-[11px] font-bold flex items-center justify-center shrink-0`}
                                aria-hidden="true"
                              >
                                {opt.badgeText}
                              </span>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-[#141413]">{opt.label}</p>
                              <p className="text-[11px] text-[#5C5B57]">{opt.sub}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {(paymentMethod === 'bkash' ||
                      paymentMethod === 'nagad' ||
                      paymentMethod === 'rocket') && (() => {
                      const walletLabel =
                        paymentMethod === 'bkash'
                          ? 'bKash'
                          : paymentMethod === 'nagad'
                            ? 'Nagad'
                            : 'Rocket';
                      const walletNumber =
                        paymentMethod === 'bkash'
                          ? siteSettings.bkashNumber
                          : paymentMethod === 'nagad'
                            ? siteSettings.nagadNumber
                            : siteSettings.rocketNumber;
                      const sampleTrx =
                        paymentMethod === 'bkash'
                          ? 'BKH8M31LP'
                          : paymentMethod === 'nagad'
                            ? 'NGD7K24QP'
                            : 'RKT9P12MN';
                      return (
                        <div className="p-4 rounded-xl bg-[#F2F1ED] border border-[#141413]/10 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-[#141413] leading-relaxed">
                              Send{' '}
                              <span className="font-bold tabular-nums">
                                {formatBDT(grandTotalBdt)}
                              </span>{' '}
                              via <span className="font-semibold">{walletLabel}</span> to:
                            </p>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(walletNumber);
                                  setCopiedWallet(true);
                                  window.setTimeout(() => setCopiedWallet(false), 1800);
                                } catch {
                                  // ignore clipboard failure
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#141413]/15 text-xs font-mono-tabular font-semibold text-[#141413] hover:border-[#0F523E]"
                            >
                              <span>{walletNumber}</span>
                              {copiedWallet ? (
                                <Check className="w-3.5 h-3.5 text-[#0F523E]" aria-hidden="true" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#5C5B57]" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            value={trxId}
                            onChange={(e) => setTrxId(e.target.value)}
                            placeholder={`Enter ${walletLabel} TrxID (e.g. ${sampleTrx})`}
                            className="w-full h-10 px-3 bg-white border border-[#141413]/15 rounded-lg text-xs font-mono-tabular uppercase text-[#141413] focus:outline-none focus:border-[#0F523E]"
                          />
                        </div>
                      );
                    })()}

                    {paymentMethod === 'card' && (
                      <div className="p-4 rounded-xl bg-[#F2F1ED] border border-[#141413]/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[#141413]">
                            Mastercard / Visa Card Authorization ({formatBDT(grandTotalBdt)})
                          </p>
                          <span className="text-[11px] font-medium text-[#0F523E]">
                            SSLCommerz Protected
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            required
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Cardholder Name"
                            className="sm:col-span-2 h-10 px-3 bg-white border border-[#141413]/15 rounded-lg text-xs text-[#141413] focus:outline-none focus:border-[#0F523E]"
                          />
                          <input
                            type="text"
                            required
                            maxLength={4}
                            inputMode="numeric"
                            value={cardLast4}
                            onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="Last 4 digits"
                            className="h-10 px-3 bg-white border border-[#141413]/15 rounded-lg text-xs font-mono-tabular text-[#141413] focus:outline-none focus:border-[#0F523E]"
                          />
                        </div>
                        <p className="text-[11px] text-[#5C5B57]">
                          For your security, only cardholder name and last 4 card digits are recorded for order verification.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Order Summary */}
                <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-[#141413]/10 space-y-4 lg:sticky lg:top-0">
                  <h3 className="text-sm font-semibold text-[#141413]">Order Summary</h3>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[#141413] truncate">{item.name}</p>
                          <p className="text-[#5C5B57]">
                            {item.variantLabel} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-semibold text-[#141413] tabular-nums shrink-0">
                          {formatBDT(item.priceBdt * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-[#141413]/10 space-y-2 text-xs">
                    <div className="flex justify-between text-[#5C5B57]">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatBDT(subtotalBdt)}</span>
                    </div>
                    {promoDiscountBdt > 0 && (
                      <div className="flex justify-between text-[#0F523E]">
                        <span>Promo ({promoCode})</span>
                        <span className="tabular-nums">−{formatBDT(promoDiscountBdt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#5C5B57]">
                      <span>Delivery ({zoneMeta.label})</span>
                      <span className="tabular-nums">
                        {deliveryFeeBdt === 0 ? 'Free' : formatBDT(deliveryFeeBdt)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#141413]/10 flex justify-between text-base font-semibold text-[#141413]">
                      <span>Total Payable</span>
                      <span className="tabular-nums">{formatBDT(grandTotalBdt)}</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <p role="alert" className="text-xs text-red-700 font-medium">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-[#0F523E] hover:bg-[#0B3F30] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {submitting
                      ? 'Confirming Order...'
                      : `Confirm Order · ${formatBDT(grandTotalBdt)}`}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-[#5C5B57]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0F523E]" aria-hidden="true" />
                    <span>7-day doorstep exchange guaranteed across Bangladesh</span>
                  </div>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
