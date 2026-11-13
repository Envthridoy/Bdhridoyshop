import { ArrowUpDown, CheckCircle2, ChevronRight, Heart, Star } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import type { CategoryId, Product, SiteSettings } from '../types/store.ts';
import { ProductCard } from './ProductCard.tsx';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

interface CatalogSectionProps {
  products: Product[];
  activeCategory: CategoryId;
  onCategoryChange: (cat: CategoryId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showSavedOnly: boolean;
  onToggleSavedOnly: () => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  siteSettings: SiteSettings;
}

export function CatalogSection({
  products,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  showSavedOnly,
  onToggleSavedOnly,
  wishlistIds,
  onToggleWishlist,
  onSelectProduct,
  onQuickAdd,
  siteSettings,
}: CatalogSectionProps) {
  const handleResetFilters = () => {
    onCategoryChange('all');
    onSearchChange('');
    if (showSavedOnly) onToggleSavedOnly();
  };

  return (
    <section id="featured-products" className="py-5 bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Sidebar: Why Choose */}
          {siteSettings.showWhyChoose && (
            <aside
              id="why-choose"
              className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
            >
              <div className="bg-[var(--brand-primary)] text-white px-5 py-4">
                <h2 className="text-base font-bold leading-snug">
                  {siteSettings.whyChooseTitle}
                </h2>
              </div>

              <div className="p-5 space-y-3.5">
                <ul className="space-y-3">
                  {siteSettings.whyChooseItems.map((item, idx) => (
                    <li key={`${idx}-${item}`} className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {siteSettings.whyChooseFooter && (
                  <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                    <p className="font-serif italic text-lg text-[var(--brand-primary)]">
                      {siteSettings.whyChooseFooter}
                    </p>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Right Main Featured Products Column */}
          <div className={`${siteSettings.showWhyChoose ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-4`}>
            {/* Featured Products Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-accent)] text-white rounded-lg text-sm font-bold shadow-2xs">
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300" aria-hidden="true" />
                  <span>Featured Products</span>
                </div>

                {(activeCategory !== 'all' || searchQuery || showSavedOnly) && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-accent)] underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onToggleSavedOnly}
                  className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${
                    showSavedOnly
                      ? 'bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-white' : ''}`} aria-hidden="true" />
                  <span>Saved ({wishlistIds.length})</span>
                </button>

                <div className="relative">
                  <ArrowUpDown
                    className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as SortOption)}
                    aria-label="Sort products"
                    className="h-9 pl-8 pr-6 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#133475]"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="hidden sm:inline-flex items-center gap-0.5 text-xs font-semibold text-[#133475] hover:text-[#E11D2E] transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* 4-Column Product Grid */}
            {products.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-xl border border-slate-200 px-4">
                <p className="text-lg font-bold text-[#133475] mb-1">No products found</p>
                <p className="text-xs text-slate-500 mb-4">
                  Try another category or reset your search query.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-[#E11D2E] text-white text-xs font-semibold rounded-lg"
                >
                  View All Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isWishlisted={wishlistIds.includes(product.id)}
                      onToggleWishlist={onToggleWishlist}
                      onSelectProduct={onSelectProduct}
                      onQuickAdd={onQuickAdd}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
