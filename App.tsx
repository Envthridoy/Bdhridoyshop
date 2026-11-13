import { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CatalogSection, type SortOption } from './components/CatalogSection.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { Footer } from './components/Footer.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { PromoAndNewsletterSection } from './components/PromoAndNewsletterSection.tsx';
import { TrackOrderModal } from './components/TrackOrderModal.tsx';
import { WhatsAppWidget } from './components/WhatsAppWidget.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { ResellerPortal } from './components/reseller/ResellerPortal.tsx';
import { DEFAULT_SITE_SETTINGS, PRODUCTS, resolveProductImage } from './data/catalog.ts';
import type {
  AdSettings,
  CartItem,
  CategoryId,
  Order,
  Product,
  ProductReview,
  SiteSettings,
} from './types/store.ts';
import { initAdPixels, trackAdEvent } from './utils/pixel.ts';

const CART_STORAGE_KEY = 'bdhridoyshop_cart_v2';
const WISHLIST_STORAGE_KEY = 'bdhridoyshop_wishlist_v2';
const ORDERS_STORAGE_KEY = 'bdhridoyshop_recent_orders_v2';
const CUSTOMER_NAME_KEY = 'bdhridoyshop_customer_name_v1';
const ADMIN_TOKEN_KEY = 'bdhridoyshop_admin_token_v1';
const ADMIN_USER_KEY = 'bdhridoyshop_admin_user_v1';
const RESELLER_REF_KEY = 'bdhridoyshop_ref_reseller_v1';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getRouteViewMode(): 'store' | 'admin' | 'reseller' {
  if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
    return 'admin';
  }
  if (window.location.pathname === '/reseller' || window.location.hash === '#reseller') {
    return 'reseller';
  }
  return 'store';
}

export default function App() {
  const [viewMode, setViewMode] = useState<'store' | 'admin' | 'reseller'>(() =>
    getRouteViewMode(),
  );
  const [refResellerCode, setRefResellerCode] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(RESELLER_REF_KEY);
    } catch {
      return null;
    }
  });
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    try {
      return window.localStorage.getItem(ADMIN_USER_KEY) || 'admin@bdhridoyshop.com';
    } catch {
      return 'admin@bdhridoyshop.com';
    }
  });
  const [customerName, setCustomerName] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(CUSTOMER_NAME_KEY);
    } catch {
      return null;
    }
  });

  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [dealsOnly, setDealsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => readStorage(CART_STORAGE_KEY, []));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readStorage(WISHLIST_STORAGE_KEY, []),
  );
  const [recentOrderCodes, setRecentOrderCodes] = useState<string[]>(() =>
    readStorage(ORDERS_STORAGE_KEY, []),
  );

  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscountBdt, setPromoDiscountBdt] = useState(0);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [activeTrackCode, setActiveTrackCode] = useState<string | null>(null);

  const loadLiveProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        const hydrated = (data.products as Product[]).map((p) => ({
          ...p,
          image: resolveProductImage(p),
        }));
        setProducts(hydrated);
      }
    } catch {
      // Keep initial catalog fallback if offline
    }
  }, []);

  const loadSiteSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/site-settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.siteSettings) {
        setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...data.siteSettings });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLiveProducts();
    loadSiteSettings();
  }, [loadLiveProducts, loadSiteSettings]);

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', siteSettings.primaryColor);
    document.documentElement.style.setProperty('--brand-accent', siteSettings.accentColor);
    if (siteSettings.storeName) {
      document.title = `${siteSettings.storeName} — ${siteSettings.tagline || 'Online Shopping in Bangladesh'}`;
    }
  }, [siteSettings]);

  useEffect(() => {
    fetch('/api/ad-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { adSettings?: AdSettings } | null) => {
        if (data?.adSettings) {
          initAdPixels(data.adSettings);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rsl = params.get('reseller');
    if (rsl && rsl.trim()) {
      const normalized = rsl.trim().toUpperCase();
      setRefResellerCode(normalized);
      try {
        window.localStorage.setItem(RESELLER_REF_KEY, normalized);
      } catch {
        // ignore
      }
    }
    const targetSlug = params.get('product');
    if (!targetSlug) return;
    const match = products.find((p) => p.slug === targetSlug || p.id === targetSlug);
    if (match) {
      setSelectedProductId(match.id);
    }
  }, [products]);

  useEffect(() => {
    const onPopState = () => {
      setViewMode(getRouteViewMode());
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  useEffect(() => {
    if (!adminToken) return;
    fetch('/api/admin/session', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          setAdminToken(null);
          try {
            window.localStorage.removeItem(ADMIN_TOKEN_KEY);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        // ignore transient error
      });
  }, [adminToken]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(recentOrderCodes));
    } catch {
      // ignore
    }
  }, [recentOrderCodes]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (showSavedOnly && !wishlistIds.includes(p.id)) return false;
      if (dealsOnly) {
        const pct =
          p.discountPercent ??
          (p.compareAtBdt && p.compareAtBdt > p.priceBdt
            ? Math.round(((p.compareAtBdt - p.priceBdt) / p.compareAtBdt) * 100)
            : 0);
        if (pct < 25) return false;
      }
      if (!showSavedOnly && activeCategory !== 'all' && p.category !== activeCategory) {
        return false;
      }
      if (q) {
        const hay = `${p.name} ${p.categoryLabel} ${p.origin} ${p.shortDesc}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.priceBdt - b.priceBdt);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.priceBdt - a.priceBdt);
    }
    if (sortBy === 'rating') {
      return [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    }
    return list;
  }, [products, activeCategory, dealsOnly, searchQuery, sortBy, showSavedOnly, wishlistIds]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const handleAddToCart = (
    product: Product,
    variantId: string,
    variantLabel: string,
    quantity: number,
  ) => {
    trackAdEvent('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.priceBdt * quantity,
      currency: 'BDT',
    });
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.variantId === variantId,
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity,
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          variantLabel,
          name: product.name,
          priceBdt: product.priceBdt,
          image: product.image,
          categoryLabel: product.categoryLabel,
          quantity,
        },
      ];
    });
  };

  const handleQuickAdd = (product: Product) => {
    const firstVariant = product.variants[0];
    handleAddToCart(product, firstVariant.id, firstVariant.label, 1);
  };

  const handleUpdateQty = (productId: string, variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (productId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantId === variantId)),
    );
  };

  const handleAddReview = (productId: string, review: ProductReview) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              reviews: [review, ...p.reviews],
              reviewCount: p.reviewCount + 1,
            }
          : p,
      ),
    );
  };

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: CategoryId) => {
    setDealsOnly(false);
    setShowSavedOnly(false);
    setActiveCategory(cat);
  };

  const handleOrderConfirmed = (order: Order) => {
    trackAdEvent('Purchase', {
      value: order.pricing.totalBdt,
      currency: 'BDT',
      content_ids: order.items.map((i) => i.productId),
      num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
    });
    setCart([]);
    setPromoCode(null);
    setPromoDiscountBdt(0);
    setRecentOrderCodes((prev) => [order.orderCode, ...prev.filter((c) => c !== order.orderCode)]);
    loadLiveProducts();
  };

  const handleTrackOrder = (orderCode: string) => {
    setActiveTrackCode(orderCode);
    setIsTrackModalOpen(true);
  };

  const openAdminView = () => {
    window.history.pushState({}, '', '/admin');
    setViewMode('admin');
    window.scrollTo({ top: 0 });
  };

  const openResellerView = () => {
    window.history.pushState({}, '', '/reseller');
    setViewMode('reseller');
    window.scrollTo({ top: 0 });
  };

  const openStoreView = () => {
    window.history.pushState({}, '', '/');
    setViewMode('store');
    loadLiveProducts();
    window.scrollTo({ top: 0 });
  };

  const handleAdminLoginSuccess = (token: string, username: string) => {
    setAdminToken(token);
    setAdminUsername(username);
    try {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
      window.localStorage.setItem(ADMIN_USER_KEY, username);
    } catch {
      // ignore
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    try {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      // ignore
    }
  };

  const handleCustomerLogin = (name: string) => {
    setCustomerName(name);
    try {
      window.localStorage.setItem(CUSTOMER_NAME_KEY, name);
    } catch {
      // ignore
    }
  };

  const handleCustomerLogout = () => {
    setCustomerName(null);
    try {
      window.localStorage.removeItem(CUSTOMER_NAME_KEY);
    } catch {
      // ignore
    }
  };

  if (viewMode === 'reseller') {
    return (
      <MotionConfig reducedMotion="user">
        <ResellerPortal siteSettings={siteSettings} onBackToStore={openStoreView} />
      </MotionConfig>
    );
  }

  if (viewMode === 'admin') {
    return (
      <MotionConfig reducedMotion="user">
        {adminToken ? (
          <AdminDashboard
            token={adminToken}
            username={adminUsername}
            onLogout={handleAdminLogout}
            onBackToStore={openStoreView}
            onProductsChanged={setProducts}
            onSiteSettingsChanged={setSiteSettings}
          />
        ) : (
          <AdminLogin
            onSuccess={handleAdminLoginSuccess}
            onBackToStore={openStoreView}
          />
        )}
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-[#F4F6FA] text-slate-900">
        <Navbar
          cartCount={cartCount}
          wishlistCount={wishlistIds.length}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setDealsOnly(false);
            setSearchQuery(q);
          }}
          onSearchSubmit={() => scrollToId('featured-products')}
          onOpenCart={() => setIsCartOpen(true)}
          onToggleWishlistFilter={() => {
            setDealsOnly(false);
            setShowSavedOnly((prev) => !prev);
            scrollToId('featured-products');
          }}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenTrackOrder={() => {
            setActiveTrackCode(recentOrderCodes[0] || 'BDH-1042');
            setIsTrackModalOpen(true);
          }}
          onSelectCategory={handleSelectCategory}
          onNavigateSection={scrollToId}
          onOpenReseller={openResellerView}
          loggedInCustomerName={customerName}
          siteSettings={siteSettings}
        />

        <main className="flex-1">
          <HeroSection
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              handleSelectCategory(cat);
              if (cat !== 'all') {
                scrollToId('featured-products');
              }
            }}
            onShopNow={() => {
              handleSelectCategory('all');
              scrollToId('featured-products');
            }}
            onDealsClick={() => {
              setDealsOnly(true);
              setActiveCategory('all');
              scrollToId('featured-products');
            }}
            siteSettings={siteSettings}
          />

          <CatalogSection
            products={filteredProducts}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setDealsOnly(false);
              setActiveCategory(cat);
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            showSavedOnly={showSavedOnly}
            onToggleSavedOnly={() => setShowSavedOnly((prev) => !prev)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onSelectProduct={(p) => {
              trackAdEvent('ViewContent', {
                content_ids: [p.id],
                content_name: p.name,
                content_type: 'product',
                value: p.priceBdt,
                currency: 'BDT',
              });
              setSelectedProductId(p.id);
            }}
            onQuickAdd={handleQuickAdd}
            siteSettings={siteSettings}
          />

          <PromoAndNewsletterSection
            onShopDeals={() => {
              setDealsOnly(true);
              setActiveCategory('all');
              scrollToId('featured-products');
            }}
            siteSettings={siteSettings}
          />
        </main>

        <Footer
          onSelectCategory={(cat) => {
            handleSelectCategory(cat);
            scrollToId('featured-products');
          }}
          onOpenTrackOrder={() => {
            setActiveTrackCode(recentOrderCodes[0] || 'BDH-1042');
            setIsTrackModalOpen(true);
          }}
          onOpenAdmin={openAdminView}
          onOpenReseller={openResellerView}
          onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
          siteSettings={siteSettings}
        />

        <WhatsAppWidget
          isOpen={isWhatsAppOpen}
          onToggle={setIsWhatsAppOpen}
          storeName={siteSettings.storeName}
          whatsappNumber={siteSettings.whatsappNumber}
        />

        <ProductDetailModal
          product={selectedProduct}
          isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
          onClose={() => setSelectedProductId(null)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
          onAddReview={handleAddReview}
        />

        <CartDrawer
          isOpen={isCartOpen}
          items={cart}
          promoCode={promoCode}
          promoDiscountBdt={promoDiscountBdt}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onApplyPromo={(code, discount) => {
            setPromoCode(code);
            setPromoDiscountBdt(discount);
          }}
          onClearPromo={() => {
            setPromoCode(null);
            setPromoDiscountBdt(0);
          }}
          onCheckout={() => {
            trackAdEvent('InitiateCheckout', {
              value: cart.reduce((sum, item) => sum + item.priceBdt * item.quantity, 0),
              currency: 'BDT',
              num_items: cart.reduce((sum, item) => sum + item.quantity, 0),
            });
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
        />

        <CheckoutModal
          isOpen={isCheckoutOpen}
          items={cart}
          promoCode={promoCode}
          promoDiscountBdt={promoDiscountBdt}
          siteSettings={siteSettings}
          refResellerCode={refResellerCode}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderConfirmed={handleOrderConfirmed}
          onTrackNewOrder={handleTrackOrder}
        />

        <TrackOrderModal
          isOpen={isTrackModalOpen}
          initialOrderCode={activeTrackCode}
          recentOrderCodes={recentOrderCodes}
          onClose={() => setIsTrackModalOpen(false)}
        />

        <LoginModal
          isOpen={isLoginModalOpen}
          loggedInCustomerName={customerName}
          onClose={() => setIsLoginModalOpen(false)}
          onCustomerLogin={handleCustomerLogin}
          onCustomerLogout={handleCustomerLogout}
        />
      </div>
    </MotionConfig>
  );
}
