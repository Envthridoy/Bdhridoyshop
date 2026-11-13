import { useEffect, useState } from 'react';
import { Check, ExternalLink, Heart, Minus, Plus, Star, Truck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { BangladeshZone, Product, ProductReview } from '../types/store.ts';
import { DELIVERY_ZONES, formatBDT } from '../utils/format.ts';
import { trackAdEvent } from '../utils/pixel.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductDetailModalProps {
  product: Product | null;
  isWishlisted: boolean;
  onClose: () => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, variantId: string, variantLabel: string, quantity: number) => void;
  onAddReview: (productId: string, review: ProductReview) => void;
}

export function ProductDetailModal({
  product,
  isWishlisted,
  onClose,
  onToggleWishlist,
  onAddToCart,
  onAddReview,
}: ProductDetailModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryZone, setDeliveryZone] = useState<BangladeshZone>('dhaka-metro');
  const [addedFeedback, setAddedFeedback] = useState(false);

  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewCity, setReviewCity] = useState('Dhaka');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedVariantId(product.variants[0]?.id ?? '');
      setQuantity(1);
      setAddedFeedback(false);
      setReviewSubmitted(false);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];

  const handleAdd = () => {
    onAddToCart(
      product,
      selectedVariant.id,
      selectedVariant.label,
      quantity,
    );
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1500);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;

    const fallbackReview: ProductReview = {
      id: `rev-${Date.now()}`,
      author: reviewAuthor.trim(),
      city: reviewCity.trim() || 'Dhaka',
      rating: reviewRating,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      comment: reviewComment.trim(),
    };

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: fallbackReview.author,
          city: fallbackReview.city,
          rating: fallbackReview.rating,
          comment: fallbackReview.comment,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onAddReview(product.id, data.review);
      } else {
        onAddReview(product.id, fallbackReview);
      }
    } catch {
      onAddReview(product.id, fallbackReview);
    }

    setReviewAuthor('');
    setReviewComment('');
    setReviewRating(5);
    setReviewSubmitted(true);
  };

  const zoneInfo = DELIVERY_ZONES[deliveryZone];
  const qualifiesFree = product.priceBdt * quantity >= 5000;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#141413]/55 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl bg-[#FAFAF8] sm:rounded-2xl shadow-2xl overflow-hidden max-h-screen sm:max-h-[90vh] flex flex-col"
        >
          {/* Close bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#141413]/10 bg-white shrink-0">
            <div className="flex items-center gap-2 text-xs text-[#5C5B57]">
              <span>{product.categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{product.origin}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close product details"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[#5C5B57] hover:text-[#141413] hover:bg-[#F2F1ED] transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto p-6 lg:p-8 space-y-10">
            {/* Contiguous Purchase Module */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Left Gallery */}
              <div className="lg:col-span-6 lg:sticky lg:top-0">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F2F1ED]">
                  <ResilientImage
                    src={product.image}
                    alt={product.name}
                    fallbackTitle={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Craft Specifications */}
                <div className="mt-6 pt-6 border-t border-[#141413]/10 grid grid-cols-2 gap-4">
                  {product.specs.map((spec) => (
                    <div key={spec.label}>
                      <p className="text-[11px] uppercase tracking-wider text-[#5C5B57] mb-0.5">
                        {spec.label}
                      </p>
                      <p className="text-xs font-medium text-[#141413]">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Purchase Controls */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs font-medium text-[#0F523E]">
                      {product.availabilityNote} · {product.stock} left
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[#5C5B57]">
                      <Star className="w-3.5 h-3.5 fill-[#B4843E] text-[#B4843E]" aria-hidden="true" />
                      <span className="font-semibold text-[#141413] tabular-nums">
                        {product.rating.toFixed(1)}
                      </span>
                      <span className="tabular-nums">({product.reviews.length} reviews)</span>
                    </div>
                  </div>

                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#141413] leading-tight mb-3">
                    {product.name}
                  </h2>

                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-2xl font-semibold text-[#141413] tabular-nums">
                      {formatBDT(product.priceBdt)}
                    </span>
                    {product.compareAtBdt && (
                      <span className="text-sm text-[#5C5B57] line-through tabular-nums">
                        {formatBDT(product.compareAtBdt)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-[#5C5B57]">{product.story}</p>
                </div>

                {/* Variant Selector */}
                <div className="pt-4 border-t border-[#141413]/10">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#5C5B57] mb-3">
                    Select Option: <span className="text-[#141413]">{selectedVariant.label}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const isSelected = variant.id === selectedVariant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                            isSelected
                              ? 'border-[#0F523E] bg-[#0F523E]/6 text-[#0F523E]'
                              : 'border-[#141413]/15 bg-white text-[#141413] hover:border-[#141413]/35'
                          }`}
                        >
                          {variant.colorHex && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: variant.colorHex }}
                              aria-hidden="true"
                            />
                          )}
                          <span>{variant.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity & Primary Purchase CTA */}
                <div className="space-y-3">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                    {!(product.externalUrl && product.actionMode === 'external') && (
                      <>
                        <div className="inline-flex items-center border border-[#141413]/15 rounded-lg bg-white h-12">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            aria-label="Decrease quantity"
                            className="w-11 h-full flex items-center justify-center text-[#141413] hover:bg-[#F2F1ED] rounded-l-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                            aria-label="Increase quantity"
                            className="w-11 h-full flex items-center justify-center text-[#141413] hover:bg-[#F2F1ED] rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleAdd}
                          className="flex-1 h-12 px-6 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          {addedFeedback ? (
                            <>
                              <Check className="w-4 h-4" aria-hidden="true" />
                              <span>Added to Bag</span>
                            </>
                          ) : (
                            <span>
                              Add to Bag · {formatBDT(product.priceBdt * quantity)}
                            </span>
                          )}
                        </button>
                      </>
                    )}

                    {product.externalUrl && product.actionMode === 'external' && (
                      <a
                        href={product.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAdEvent('OutboundClick', {
                            content_name: product.name,
                            content_id: product.id,
                            source_platform: product.sourcePlatform || 'External',
                            value: product.priceBdt,
                            currency: 'BDT',
                          })
                        }
                        className="flex-1 h-12 px-6 bg-[#133475] hover:bg-[#0E2758] text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        <span>
                          Buy on {product.sourcePlatform || 'Partner Store'} · {formatBDT(product.priceBdt)}
                        </span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product.id)}
                      aria-label={isWishlisted ? 'Remove from saved' : 'Save to wishlist'}
                      className="w-12 h-12 rounded-lg border border-[#141413]/15 bg-white hover:bg-[#F2F1ED] flex items-center justify-center transition-colors shrink-0"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          isWishlisted ? 'fill-[#0F523E] text-[#0F523E]' : 'text-[#5C5B57]'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {product.externalUrl && product.actionMode !== 'external' && (
                    <a
                      href={product.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackAdEvent('OutboundClick', {
                          content_name: product.name,
                          content_id: product.id,
                          source_platform: product.sourcePlatform || 'External',
                          value: product.priceBdt,
                          currency: 'BDT',
                        })
                      }
                      className="w-full h-11 px-5 bg-[#133475] hover:bg-[#0E2758] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      <span>Or Visit {product.sourcePlatform || 'Official Store'} Offer</span>
                    </a>
                  )}
                </div>

                {/* Bangladesh Zone Delivery Estimator */}
                <div className="p-4 rounded-xl bg-white border border-[#141413]/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#141413]">
                      <Truck className="w-4 h-4 text-[#0F523E]" aria-hidden="true" />
                      <span>Bangladesh Delivery Estimator</span>
                    </div>
                    <select
                      value={deliveryZone}
                      onChange={(e) => setDeliveryZone(e.target.value as BangladeshZone)}
                      aria-label="Select delivery zone"
                      className="text-xs font-medium bg-[#F2F1ED] text-[#141413] px-2.5 py-1.5 rounded-md focus:outline-none"
                    >
                      <option value="dhaka-metro">Dhaka Metro</option>
                      <option value="sub-dhaka">Sub-Dhaka</option>
                      <option value="nationwide">Outside Dhaka (64 Districts)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#5C5B57]">
                    <span>{zoneInfo.eta}</span>
                    <span className="font-semibold text-[#141413] tabular-nums">
                      {qualifiesFree ? 'Free Delivery' : formatBDT(zoneInfo.feeBdt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Customer Reviews */}
            <div className="pt-8 border-t border-[#141413]/10 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-display text-2xl font-semibold text-[#141413]">
                  Verified Customer Notes
                </h3>
                <div className="space-y-4">
                  {product.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl bg-white border border-[#141413]/8 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#141413]">
                          {rev.author} · <span className="font-normal text-[#5C5B57]">{rev.city}</span>
                        </span>
                        <span className="text-[#5C5B57]">{rev.date}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="w-3 h-3 fill-[#B4843E] text-[#B4843E]"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <p className="text-sm text-[#5C5B57] leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave a Review Form */}
              <form
                onSubmit={handleReviewSubmit}
                className="lg:col-span-5 p-5 rounded-xl bg-white border border-[#141413]/10 space-y-3 h-fit"
              >
                <h4 className="text-sm font-semibold text-[#141413]">Share Your Experience</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="Your Name"
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/12 rounded-lg text-xs text-[#141413] focus:outline-none focus:border-[#0F523E]"
                  />
                  <input
                    type="text"
                    value={reviewCity}
                    onChange={(e) => setReviewCity(e.target.value)}
                    placeholder="District (e.g. Dhaka)"
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/12 rounded-lg text-xs text-[#141413] focus:outline-none focus:border-[#0F523E]"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#5C5B57]">
                  <span>Rating</span>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="h-8 px-2 bg-[#FAFAF8] border border-[#141413]/12 rounded-md text-xs text-[#141413]"
                  >
                    <option value={5}>5 Stars — Excellent</option>
                    <option value={4}>4 Stars — Very Good</option>
                    <option value={3}>3 Stars — Good</option>
                  </select>
                </div>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How did the quality and delivery feel?"
                  className="w-full p-3 bg-[#FAFAF8] border border-[#141413]/12 rounded-lg text-xs text-[#141413] focus:outline-none focus:border-[#0F523E]"
                />
                <button
                  type="submit"
                  className="w-full h-10 bg-[#141413] hover:bg-[#0F523E] text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Post Review
                </button>
                {reviewSubmitted && (
                  <p className="text-xs text-[#0F523E] font-medium">
                    Thank you—your review is now live above.
                  </p>
                )}
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
