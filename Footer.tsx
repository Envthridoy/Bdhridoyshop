import { Lock } from 'lucide-react';
import type { CategoryId, SiteSettings } from '../types/store.ts';

interface FooterProps {
  onSelectCategory: (cat: CategoryId) => void;
  onOpenTrackOrder: () => void;
  onOpenAdmin: () => void;
  onOpenReseller: () => void;
  onOpenWhatsApp: () => void;
  siteSettings: SiteSettings;
}

export function Footer({
  onSelectCategory,
  onOpenTrackOrder,
  onOpenAdmin,
  onOpenReseller,
  onOpenWhatsApp,
  siteSettings,
}: FooterProps) {
  return (
    <footer id="site-footer" className="bg-[var(--brand-primary)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
        <div className="space-y-2">
          <p className="text-base font-bold">{siteSettings.storeName}</p>
          <p className="text-white/75 leading-relaxed">{siteSettings.footerDescription}</p>
        </div>

        <div className="space-y-2">
          <p className="font-semibold uppercase tracking-wider text-white/60">Shop Categories</p>
          <div className="grid grid-cols-2 gap-1.5 text-white/85">
            <button type="button" onClick={() => onSelectCategory('mobiles')} className="text-left hover:text-white">
              Mobiles
            </button>
            <button type="button" onClick={() => onSelectCategory('laptops')} className="text-left hover:text-white">
              Laptops
            </button>
            <button type="button" onClick={() => onSelectCategory('accessories')} className="text-left hover:text-white">
              Accessories
            </button>
            <button type="button" onClick={() => onSelectCategory('fashion')} className="text-left hover:text-white">
              Fashion
            </button>
            <button type="button" onClick={() => onSelectCategory('home-living')} className="text-left hover:text-white">
              Home &amp; Living
            </button>
            <button type="button" onClick={() => onSelectCategory('sports')} className="text-left hover:text-white">
              Sports
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold uppercase tracking-wider text-white/60">Customer Care</p>
          <div className="flex flex-col items-start gap-1.5 text-white/85">
            <button type="button" onClick={onOpenTrackOrder} className="hover:text-white">
              Track Your Order
            </button>
            <button type="button" onClick={onOpenReseller} className="hover:text-white">
              Reseller Channel
            </button>
            <button type="button" onClick={onOpenWhatsApp} className="hover:text-white">
              Contact Support
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold uppercase tracking-wider text-white/60">Dhaka Fulfillment Desk</p>
          <p className="text-white/80">{siteSettings.addressText}</p>
          <p className="text-white/80 font-mono-tabular">WhatsApp: {siteSettings.whatsappNumber}</p>
          <p className="text-white/70">COD · bKash · Nagad · Rocket · Mastercard</p>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16 sm:pb-14 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/85">
        <p>{siteSettings.copyrightText}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="font-mono-tabular">WhatsApp: {siteSettings.whatsappNumber}</span>
          <button type="button" onClick={onOpenWhatsApp} className="hover:underline">
            Contact support
          </button>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1 text-white/65 hover:text-white transition-colors"
          >
            <Lock className="w-3 h-3" aria-hidden="true" />
            <span>Admin Login</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
