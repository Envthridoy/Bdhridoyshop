import { useState } from 'react';
import {
  ChevronDown,
  Headphones,
  Heart,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../data/catalog.ts';
import type { CategoryId, SiteSettings } from '../types/store.ts';

interface NavbarProps {
  cartCount: number;
  wishlistCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  onOpenCart: () => void;
  onToggleWishlistFilter: () => void;
  onOpenLogin: () => void;
  onOpenTrackOrder: () => void;
  onSelectCategory: (cat: CategoryId) => void;
  onNavigateSection: (id: string) => void;
  onOpenReseller: () => void;
  loggedInCustomerName: string | null;
  siteSettings: SiteSettings;
}

export function Navbar({
  cartCount,
  wishlistCount,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onOpenCart,
  onToggleWishlistFilter,
  onOpenLogin,
  onOpenTrackOrder,
  onSelectCategory,
  onNavigateSection,
  onOpenReseller,
  loggedInCustomerName,
  siteSettings,
}: NavbarProps) {
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <div className="sticky top-0 z-40 bg-white shadow-xs">
      {/* 1. Deep Navy Top Utility Strip */}
      <div className="bg-[var(--brand-primary)] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 truncate">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Truck className="w-3.5 h-3.5 text-[#5CC8F5]" aria-hidden="true" />
              <span>{siteSettings.topBarText1}</span>
            </span>
            <span className="hidden sm:inline text-white/30" aria-hidden="true">|</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5CC8F5]" aria-hidden="true" />
              <span>{siteSettings.topBarText2}</span>
            </span>
            <span className="hidden md:inline text-white/30" aria-hidden="true">|</span>
            <span className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap">
              <Headphones className="w-3.5 h-3.5 text-[#5CC8F5]" aria-hidden="true" />
              <span>{siteSettings.topBarText3}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenTrackOrder}
              className="inline-flex items-center gap-1 hover:text-[#5CC8F5] transition-colors whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Track Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main White Brand + Search + Actions Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          {/* Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectCategory('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 shrink-0"
          >
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.storeName}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-accent)] text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              </div>
            )}
            <div>
              {siteSettings.storeName.toLowerCase() === 'bdhridoyshop' ? (
                <span className="block text-xl sm:text-2xl font-bold tracking-tight leading-none">
                  <span className="text-[var(--brand-primary)]">Bd</span>
                  <span className="text-[var(--brand-accent)]">Hridoy</span>
                  <span className="text-[var(--brand-primary)]">Shop</span>
                </span>
              ) : (
                <span className="block text-xl sm:text-2xl font-bold tracking-tight leading-none text-[var(--brand-primary)]">
                  {siteSettings.storeName}
                </span>
              )}
              {siteSettings.tagline && (
                <span className="block text-[11px] italic text-slate-500 mt-0.5">
                  {siteSettings.tagline}
                </span>
              )}
            </div>
          </a>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchForm}
            className="order-3 md:order-2 w-full md:flex-1 md:max-w-xl flex items-center"
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search for products..."
              aria-label="Search for products"
              className="w-full h-10 px-4 bg-slate-50 border border-slate-300 border-r-0 rounded-l-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand-primary)] focus:bg-white"
            />
            <button
              type="submit"
              aria-label="Search"
              className="h-10 px-4 bg-[var(--brand-accent)] hover:opacity-90 text-white rounded-r-lg transition-opacity flex items-center justify-center shrink-0"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          {/* Right User / Wishlist / Cart Actions */}
          <div className="order-2 md:order-3 flex items-center gap-3 sm:gap-5 shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[var(--brand-primary)] transition-colors"
            >
              <User className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
              <span className="hidden sm:inline text-left leading-tight">
                {loggedInCustomerName ? loggedInCustomerName : 'Login / Register'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleWishlistFilter}
              aria-label={`Wishlist (${wishlistCount})`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[var(--brand-accent)] transition-colors"
            >
              <Heart className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <span className="hidden sm:inline leading-tight">
                Wishlist <span className="tabular-nums">({wishlistCount})</span>
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open cart (${cartCount} items)`}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[var(--brand-primary)] transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
              <span>Cart</span>
              <span className="tabular-nums inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--brand-accent)] text-white text-[11px]">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Category & Page Nav Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-11">
          {/* All Categories Red Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCatMenuOpen((prev) => !prev)}
              className="h-9 px-4 bg-[var(--brand-accent)] hover:opacity-90 text-white text-xs font-semibold rounded-md inline-flex items-center gap-2 transition-opacity whitespace-nowrap"
            >
              <Menu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All Categories</span>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            {catMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setCatMenuOpen(false);
                      onNavigateSection('featured-products');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#E11D2E] transition-colors"
                  >
                    {cat.label === 'Home' ? 'All Products' : cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav
            aria-label="Storefront links"
            className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-700"
          >
            <button
              type="button"
              onClick={() => {
                onSelectCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('featured-products')}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('special-offers')}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Deals
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('newsletter-section')}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Offers
            </button>
            <button
              type="button"
              onClick={onOpenTrackOrder}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('why-choose')}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('site-footer')}
              className="hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={onOpenReseller}
              className="text-[#0F523E] font-semibold hover:text-[#E11D2E] transition-colors whitespace-nowrap"
            >
              Reseller Hub
            </button>
          </nav>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1">
            {[
              { label: 'Home', action: () => onSelectCategory('all') },
              { label: 'Shop All Products', action: () => onNavigateSection('featured-products') },
              { label: 'Special Deals', action: () => onNavigateSection('special-offers') },
              { label: 'Newsletter Offers', action: () => onNavigateSection('newsletter-section') },
              { label: 'Track Order', action: onOpenTrackOrder },
              { label: 'Reseller Hub (Earn Profit)', action: onOpenReseller },
              { label: 'Customer Login / Register', action: onOpenLogin },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  item.action();
                }}
                className="text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
