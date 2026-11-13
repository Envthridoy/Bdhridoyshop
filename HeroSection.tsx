import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Dumbbell,
  Gift,
  Headphones,
  Home,
  Laptop,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Truck,
  Watch,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CATEGORIES } from '../data/catalog.ts';
import type { CategoryId, SiteSettings } from '../types/store.ts';

interface HeroSectionProps {
  activeCategory: CategoryId;
  onSelectCategory: (cat: CategoryId) => void;
  onShopNow: () => void;
  onDealsClick: () => void;
  siteSettings: SiteSettings;
}

function getCategoryIcon(id: CategoryId) {
  switch (id) {
    case 'all':
      return Home;
    case 'mobiles':
      return Smartphone;
    case 'laptops':
      return Laptop;
    case 'accessories':
      return Headphones;
    case 'fashion':
      return ShoppingBag;
    case 'home-living':
      return Watch;
    case 'beauty':
      return Sparkles;
    case 'sports':
      return Dumbbell;
    case 'gifts':
      return Gift;
  }
}

export function HeroSection({
  activeCategory,
  onSelectCategory,
  onShopNow,
  onDealsClick,
  siteSettings,
}: HeroSectionProps) {
  const [slideIdx, setSlideIdx] = useState(0);

  const slides = [
    {
      id: 'welcome',
      eyebrow: siteSettings.heroEyebrow,
      title: siteSettings.heroHeadline,
      brandHighlight: siteSettings.heroHeadline.toLowerCase() === 'bdhridoyshop',
      subtitle: siteSettings.heroSubtitle,
      badgeTop: siteSettings.heroBadgeTop,
      badgeMain: siteSettings.heroBadgeMain,
      ctaLabel: 'Shop Now',
    },
    {
      id: 'flash',
      eyebrow: 'Bangladesh Express',
      title: `${siteSettings.specialOfferTitle} ${siteSettings.specialOfferSubtitle}`.trim(),
      brandHighlight: false,
      subtitle: 'Next-day Dhaka delivery & nationwide COD across all 64 districts.',
      badgeTop: 'Verified Quality',
      badgeMain: siteSettings.specialOfferPromoCode
        ? `Use Code ${siteSettings.specialOfferPromoCode} at Checkout`
        : 'Express Delivery Nationwide',
      ctaLabel: 'Browse Deals',
    },
    {
      id: 'heritage',
      eyebrow: 'Curated Collection',
      title: 'Tech, Fashion & Home Essentials',
      brandHighlight: false,
      subtitle: 'Authentic Jamdani, smart wearables & studio accessories in one place.',
      badgeTop: '7-Day Easy Return',
      badgeMain: 'bKash, Nagad & Cash on Delivery',
      ctaLabel: 'Explore Store',
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const currentSlide = slides[slideIdx] ?? slides[0];

  return (
    <section id="top" className="bg-[#F4F6FA] pt-4 pb-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Sky-Blue Promotional Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E4F4FF] via-[#B4E4FF] to-[#49BDF2] border border-sky-200/80 px-6 sm:px-10 py-8 sm:py-10">
          {siteSettings.heroBannerUrl && (
            <img
              src={siteSettings.heroBannerUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            />
          )}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-3"
                >
                  <p className="text-lg sm:text-xl font-bold text-[var(--brand-primary)]">
                    {currentSlide.eyebrow}
                  </p>
                  {currentSlide.brandHighlight ? (
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none">
                      <span className="text-[var(--brand-primary)]">Bd</span>
                      <span className="text-[var(--brand-accent)]">Hridoy</span>
                      <span className="text-[var(--brand-primary)]">Shop</span>
                    </h1>
                  ) : (
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--brand-primary)] leading-tight">
                      {currentSlide.title}
                    </h1>
                  )}
                  <p className="text-base sm:text-lg italic font-medium text-[var(--brand-primary)]/90">
                    {currentSlide.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[var(--brand-primary)] pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
                  <span>Fast Delivery</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
                  <span>Secure Payment</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
                  <span>24/7 Support</span>
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={slideIdx === 1 ? onDealsClick : onShopNow}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-accent)] hover:opacity-90 text-white text-sm font-semibold rounded-full shadow-sm transition-opacity"
                >
                  <span>{currentSlide.ctaLabel}</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Right Promotional Showcase Card */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-4">
              <div className="hidden sm:flex flex-col items-center justify-center w-36 h-60 rounded-3xl bg-white border-4 border-slate-800 shadow-lg p-3 text-center">
                {siteSettings.logoUrl ? (
                  <img
                    src={siteSettings.logoUrl}
                    alt={siteSettings.storeName}
                    className="w-10 h-10 rounded-xl object-cover mb-2"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-accent)] text-white flex items-center justify-center mb-2">
                    <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                  </div>
                )}
                <p className="text-xs font-bold text-[var(--brand-primary)] truncate max-w-full px-1">
                  {siteSettings.storeName}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">All 64 Districts Express</p>
                <span className="mt-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-semibold">
                  Verified <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
                </span>
              </div>

              <div className="flex flex-col gap-3 max-w-xs">
                <div className="bg-[#FACC15] text-[var(--brand-primary)] px-4 py-3 rounded-xl shadow-sm -rotate-2">
                  <p className="text-lg font-extrabold leading-tight">
                    {currentSlide.badgeTop}
                  </p>
                </div>
                <div className="bg-[var(--brand-accent)] text-white px-4 py-3 rounded-xl shadow-md rotate-1">
                  <p className="text-sm font-bold leading-snug">{currentSlide.badgeMain}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="relative z-10 mt-6 flex items-center justify-center gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlideIdx(idx)}
                aria-label={`Show slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === slideIdx ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 9-Category Circular Icon Strip */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-4 shadow-2xs">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className="group flex flex-col items-center gap-1.5 py-1 focus-visible:outline-2 focus-visible:outline-[#133475] rounded-lg"
                >
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${cat.colorClass} ${
                      isSelected ? 'ring-2 ring-offset-2 ring-[#133475]' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span
                    className={`text-xs font-medium text-center leading-tight ${
                      isSelected ? 'text-[#E11D2E] font-semibold' : 'text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
