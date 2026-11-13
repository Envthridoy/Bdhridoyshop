import { useState } from 'react';
import { Check, Eye, ExternalLink, Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import type { Product } from '../types/store.ts';
import { formatBDT } from '../utils/format.ts';
import { trackAdEvent } from '../utils/pixel.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  onSelectProduct,
  onQuickAdd,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  const discount =
    product.discountPercent ??
    (product.compareAtBdt && product.compareAtBdt > product.priceBdt
      ? Math.round(((product.compareAtBdt - product.priceBdt) / product.compareAtBdt) * 100)
      : 0);

  const hasExternalLink = Boolean(product.externalUrl && product.externalUrl.trim());
  const isExternalOnly = hasExternalLink && product.actionMode === 'external';
  const visitLabel = product.sourcePlatform ? `Buy on ${product.sourcePlatform}` : 'Visit Store';

  const handleOutboundClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAdEvent('OutboundClick', {
      content_name: product.name,
      content_id: product.id,
      source_platform: product.sourcePlatform || 'External',
      value: product.priceBdt,
      currency: 'BDT',
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Image Stage */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectProduct(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectProduct(product);
          }
        }}
        className="relative aspect-[4/3] bg-[#F5F7FB] overflow-hidden cursor-pointer"
      >
        <ResilientImage
          src={product.image}
          alt={product.name}
          fallbackTitle={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {discount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#E11D2E] text-white text-[11px] font-bold tabular-nums shadow-xs">
              -{discount}%
            </span>
          )}
          {product.adBadge && (
            <span className="px-2 py-0.5 rounded-full bg-[#133475] text-white text-[10px] font-semibold uppercase tracking-wide shadow-xs">
              {product.adBadge}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#E11D2E] transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${isWishlisted ? 'fill-[#E11D2E] text-[#E11D2E]' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Product Info & Dual Action Buttons */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate">
              {product.categoryLabel}
            </p>
            {product.sourcePlatform && product.sourcePlatform !== 'BdHridoyShop' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EAF5FF] text-[#133475] shrink-0">
                {product.sourcePlatform}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[var(--brand-primary)] leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              className="text-left hover:text-[var(--brand-accent)] transition-colors"
            >
              {product.name}
            </button>
          </h3>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-[var(--brand-accent)] tabular-nums">
              {formatBDT(product.priceBdt)}
            </span>
            {product.compareAtBdt && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                {formatBDT(product.compareAtBdt)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {isExternalOnly ? (
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className="h-9 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[var(--brand-primary)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Details</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className={`h-9 px-2.5 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  justAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--brand-accent)] hover:opacity-90 text-white'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            )}

            {hasExternalLink ? (
              <a
                href={product.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOutboundClick}
                className="h-9 px-2.5 rounded-md bg-[var(--brand-primary)] hover:opacity-90 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 transition-opacity whitespace-nowrap truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{visitLabel}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className="h-9 px-2.5 rounded-md bg-[var(--brand-primary)] hover:opacity-90 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 transition-opacity whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                <span>Visit Store</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
