import { useState } from 'react';
import {
  ChevronRight,
  Mail,
  Megaphone,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import type { SiteSettings } from '../types/store.ts';

interface PromoAndNewsletterSectionProps {
  onShopDeals: () => void;
  siteSettings: SiteSettings;
}

export function PromoAndNewsletterSection({
  onShopDeals,
  siteSettings,
}: PromoAndNewsletterSectionProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Could not subscribe right now.');
      } else {
        setStatusMessage(data.message || `Subscribed to ${siteSettings.storeName} promotional updates!`);
        setEmail('');
      }
    } catch {
      setErrorMessage('Network error while subscribing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-6 bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
        {/* 2-Column Special Offer + Newsletter Row */}
        {(siteSettings.showPromoBanner || siteSettings.showNewsletter) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Special Offer Card */}
            {siteSettings.showPromoBanner && (
              <div
                id="special-offers"
                className={`${siteSettings.showNewsletter ? 'lg:col-span-6' : 'lg:col-span-12'} rounded-2xl bg-gradient-to-r from-[#FFF3D1] to-[#FDE6B1] border border-amber-200/80 p-6 sm:p-7 flex flex-col justify-between gap-4`}
              >
                <div className="space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-accent)] text-white text-xs font-bold">
                    <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{siteSettings.specialOfferBadge}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-primary)] leading-tight">
                    <span className="text-[var(--brand-accent)]">{siteSettings.specialOfferTitle}</span>{' '}
                    <span className="block text-base sm:text-lg font-semibold text-slate-800">
                      {siteSettings.specialOfferSubtitle}
                    </span>
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={onShopDeals}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--brand-accent)] hover:opacity-90 text-white text-xs font-bold rounded-full shadow-xs transition-opacity"
                  >
                    <span>Shop Now</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  {siteSettings.specialOfferPromoCode && (
                    <span className="text-xs font-medium text-slate-700">
                      Use code{' '}
                      <span className="font-mono-tabular font-bold text-[var(--brand-primary)]">
                        {siteSettings.specialOfferPromoCode}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Right: Join Our Newsletter Card */}
            {siteSettings.showNewsletter && (
              <div
                id="newsletter-section"
                className={`${siteSettings.showPromoBanner ? 'lg:col-span-6' : 'lg:col-span-12'} rounded-2xl bg-gradient-to-r from-[#F4F0FA] to-[#EAE2FA] border border-purple-200/70 p-6 sm:p-7 flex flex-col justify-between gap-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)]">
                      Join Our Newsletter
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Get the latest deals, new arrivals &amp; exclusive Bangladesh offers!
                    </p>
                  </div>
                  <Mail className="w-8 h-8 text-[#6D28D9] shrink-0" aria-hidden="true" />
                </div>

                <form onSubmit={handleSubscribe} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email Address"
                      aria-label="Your Email Address"
                      className="flex-1 h-11 px-4 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6D28D9]"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-5 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {loading ? 'Joining...' : 'Subscribe'}
                    </button>
                  </div>
                  {statusMessage && (
                    <p role="status" className="text-xs font-medium text-emerald-700">
                      {statusMessage}
                    </p>
                  )}
                  {errorMessage && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {errorMessage}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* 4-Column Light Trust Strip */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-[var(--brand-primary)]">100% Secure</p>
              <p className="text-[11px] text-slate-500">Shopping</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Truck className="w-7 h-7 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-[var(--brand-primary)]">Fast Delivery</p>
              <p className="text-[11px] text-slate-500">Across Bangladesh</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RotateCcw className="w-7 h-7 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-[var(--brand-primary)]">Easy Return</p>
              <p className="text-[11px] text-slate-500">&amp; Refund</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full bg-[var(--brand-primary)] text-white">
            <Star className="w-5 h-5 text-[#FACC15] fill-[#FACC15] shrink-0" aria-hidden="true" />
            <div className="leading-tight">
              <p className="text-xs font-bold">Grow Together with</p>
              <p className="text-[11px] text-sky-200">{siteSettings.storeName}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
