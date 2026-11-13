import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Globe,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Palette,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_SITE_SETTINGS,
  PRODUCT_IMAGE_MAP,
  resolveProductImage,
} from '../../data/catalog.ts';
import type {
  AdSettings,
  AdminOverviewStats,
  NewsletterSubscriber,
  Order,
  OrderStatus,
  Product,
  PromoCodeRule,
  ResellerAccount,
  ResellerPayoutRequest,
  SiteSettings,
} from '../../types/store.ts';
import { formatBDT } from '../../utils/format.ts';
import { ResilientImage } from '../ResilientImage.tsx';

type AdminTab = 'overview' | 'orders' | 'inventory' | 'promos' | 'ads' | 'resellers' | 'design';

interface AdminDashboardProps {
  token: string;
  username: string;
  onLogout: () => void;
  onBackToStore: () => void;
  onProductsChanged: (products: Product[]) => void;
  onSiteSettingsChanged: (settings: SiteSettings) => void;
}

const STATUS_LABELS: Record<OrderStatus, { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  packed: { label: 'Packed in Dhaka', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
  in_transit: { label: 'Out for Courier', tone: 'text-[#0F523E] bg-emerald-50 border-emerald-200' },
  delivered: { label: 'Delivered', tone: 'text-[#141413] bg-[#F2F1ED] border-[#141413]/15' },
};

export function AdminDashboard({
  token,
  username,
  onLogout,
  onBackToStore,
  onProductsChanged,
  onSiteSettingsChanged,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState<AdminOverviewStats>({
    totalRevenueBdt: 0,
    totalOrders: 0,
    pendingFulfillment: 0,
    lowStockCount: 0,
    subscriberCount: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<PromoCodeRule[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Orders filters & inspector
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Inventory search & add/edit modal
  const [productSearch, setProductSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add/Edit Product form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Product['category']>('accessories');
  const [formOrigin, setFormOrigin] = useState('BdHridoy Verified');
  const [formPrice, setFormPrice] = useState('');
  const [formCompareAt, setFormCompareAt] = useState('');
  const [formResellerPrice, setFormResellerPrice] = useState('');
  const [formStock, setFormStock] = useState('10');
  const [formAvailability, setFormAvailability] = useState<'In Stock' | 'Limited Run'>('In Stock');
  const [formImageKey, setFormImageKey] = useState('headphones');
  const [formCustomImage, setFormCustomImage] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSourcePlatform, setFormSourcePlatform] = useState('BdHridoyShop');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formActionMode, setFormActionMode] = useState<'direct' | 'external' | 'both'>('direct');
  const [formAdBadge, setFormAdBadge] = useState('');
  const [importUrlInput, setImportUrlInput] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Promo form states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'flat'>('percent');
  const [promoValue, setPromoValue] = useState('15');
  const [promoMin, setPromoMin] = useState('2000');
  const [promoLabel, setPromoLabel] = useState('');
  const [savingPromo, setSavingPromo] = useState(false);
  const [downloadingSource, setDownloadingSource] = useState(false);

  // Ads & Pixels states
  const [adSettings, setAdSettings] = useState<AdSettings>({
    metaPixelId: '',
    googleTagId: '',
    tiktokPixelId: '',
    defaultUtmSource: 'facebook',
  });
  const [savingAdSettings, setSavingAdSettings] = useState(false);
  const [adSettingsSaved, setAdSettingsSaved] = useState(false);
  const [adBuilderProductId, setAdBuilderProductId] = useState('');
  const [adBuilderPlatform, setAdBuilderPlatform] = useState('facebook');
  const [adBuilderCampaign, setAdBuilderCampaign] = useState('bd_promo_2026');
  const [copiedAdKey, setCopiedAdKey] = useState<string | null>(null);

  // Site Design customization states
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [siteSettingsSaved, setSiteSettingsSaved] = useState(false);

  // Resellers management states
  const [resellers, setResellers] = useState<ResellerAccount[]>([]);
  const [resellerPayouts, setResellerPayouts] = useState<ResellerPayoutRequest[]>([]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load admin overview.');
      } else {
        setStats(data.stats);
        setOrders(data.orders);
        const hydratedProducts = (data.products as Product[]).map((p) => ({
          ...p,
          image: resolveProductImage(p),
        }));
        setProducts(hydratedProducts);
        onProductsChanged(hydratedProducts);
        setPromos(data.promos);
        setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : []);
        setResellers(Array.isArray(data.resellers) ? data.resellers : []);
        setResellerPayouts(Array.isArray(data.resellerPayouts) ? data.resellerPayouts : []);
        if (data.adSettings) {
          setAdSettings(data.adSettings);
        }
        if (data.siteSettings) {
          const mergedSite = { ...DEFAULT_SITE_SETTINGS, ...data.siteSettings };
          setSiteSettings(mergedSite);
          onSiteSettingsChanged(mergedSite);
        }
        if (hydratedProducts.length > 0 && !adBuilderProductId) {
          setAdBuilderProductId(hydratedProducts[0].id);
        }
      }
    } catch {
      setErrorMsg('Network error loading admin data.');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout, onProductsChanged, onSiteSettingsChanged, adBuilderProductId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleStatusChange = async (orderCode: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderCode)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.orderCode === orderCode ? data.order : o)));
        setStats(data.stats);
        if (inspectOrder?.orderCode === orderCode) {
          setInspectOrder(data.order);
        }
      }
    } catch {
      setErrorMsg('Failed to update order status.');
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('accessories');
    setFormOrigin('BdHridoy Verified');
    setFormPrice('');
    setFormCompareAt('');
    setFormResellerPrice('');
    setFormStock('12');
    setFormAvailability('In Stock');
    setFormImageKey('headphones');
    setFormCustomImage('');
    setFormDesc('');
    setFormSourcePlatform('BdHridoyShop');
    setFormExternalUrl('');
    setFormActionMode('direct');
    setFormAdBadge('');
    setImportUrlInput('');
    setImportNotice('');
    setShowAddProduct(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormOrigin(p.origin);
    setFormPrice(String(p.priceBdt));
    setFormCompareAt(p.compareAtBdt ? String(p.compareAtBdt) : '');
    setFormResellerPrice(p.resellerPriceBdt ? String(p.resellerPriceBdt) : '');
    setFormStock(String(p.stock));
    setFormAvailability(p.availabilityNote);
    setFormImageKey(p.imageKey || 'showroom');
    setFormCustomImage(p.image && !Object.values(PRODUCT_IMAGE_MAP).includes(p.image) ? p.image : '');
    setFormDesc(p.shortDesc);
    setFormSourcePlatform(p.sourcePlatform || 'BdHridoyShop');
    setFormExternalUrl(p.externalUrl || '');
    setFormActionMode(p.actionMode || (p.externalUrl ? 'external' : 'direct'));
    setFormAdBadge(p.adBadge || '');
    setImportUrlInput(p.externalUrl || '');
    setImportNotice('');
    setShowAddProduct(true);
  };

  const handleImportFromUrl = async () => {
    const trimmed = importUrlInput.trim();
    if (!trimmed) {
      setImportNotice('Please paste a Daraz, Amazon, or store product link first.');
      return;
    }
    setImportingUrl(true);
    setImportNotice('');
    try {
      const res = await fetch('/api/admin/products/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: trimmed }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setImportNotice(data.error || 'Could not parse product URL.');
        return;
      }
      if (data.sourcePlatform) {
        setFormSourcePlatform(data.sourcePlatform);
        setFormOrigin(`${data.sourcePlatform} Partner`);
      }
      if (data.externalUrl) {
        setFormExternalUrl(data.externalUrl);
        setFormActionMode('external');
      }
      if (data.name && (!editingProduct || !formName.trim())) setFormName(data.name);
      if (data.shortDesc && (!editingProduct || !formDesc.trim())) setFormDesc(data.shortDesc);
      if (data.image && (!editingProduct || !formCustomImage.trim())) setFormCustomImage(data.image);
      if (data.priceBdt && (!editingProduct || !formPrice.trim())) setFormPrice(String(data.priceBdt));
      setImportNotice(data.notice || 'External product link attached.');
    } catch {
      setImportNotice('Network error checking product URL. You can still enter details manually.');
    } finally {
      setImportingUrl(false);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Please select an image smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormCustomImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setErrorMsg('');
    try {
      const url = editingProduct
        ? `/api/admin/products/${encodeURIComponent(editingProduct.id)}`
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const compareAtVal = formCompareAt.trim() ? Number(formCompareAt) : 0;
      const resellerPriceVal = formResellerPrice.trim() ? Number(formResellerPrice) : 0;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory,
          origin: formOrigin.trim(),
          priceBdt: Number(formPrice),
          compareAtBdt: compareAtVal > 0 ? compareAtVal : 0,
          resellerPriceBdt: resellerPriceVal > 0 ? resellerPriceVal : 0,
          stock: Number(formStock),
          availabilityNote: formAvailability,
          imageKey: formImageKey,
          image: formCustomImage.trim(),
          shortDesc: formDesc.trim(),
          sourcePlatform: formSourcePlatform.trim(),
          externalUrl: formExternalUrl.trim(),
          actionMode: formActionMode,
          adBadge: formAdBadge.trim(),
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not save product.');
      } else {
        setShowAddProduct(false);
        await fetchOverview();
      }
    } catch {
      setErrorMsg('Network error saving product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickStockDelta = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: nextStock }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...data.product, image: resolveProductImage(data.product) };
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === product.id ? updated : p));
          onProductsChanged(next);
          return next;
        });
        setStats(data.stats);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts((prev) => {
          const next = prev.filter((p) => p.id !== productId);
          onProductsChanged(next);
          return next;
        });
        setStats(data.stats);
      }
    } catch {
      setErrorMsg('Failed to remove product.');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromo(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          type: promoType,
          value: Number(promoValue),
          minSubtotal: Number(promoMin),
          label: promoLabel.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not create promo code.');
      } else {
        setPromos(data.promos);
        setPromoCodeInput('');
        setPromoLabel('');
      }
    } catch {
      setErrorMsg('Network error creating promo code.');
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromo = async (code: string) => {
    try {
      const res = await fetch(`/api/admin/promos/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPromos(data.promos);
      }
    } catch {
      setErrorMsg('Failed to remove promo code.');
    }
  };

  const handleDownloadSource = async () => {
    setDownloadingSource(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/download-source', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        setErrorMsg('Failed to download source archive.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BdHridoyShop-source.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setErrorMsg('Network error downloading source archive.');
    } finally {
      setDownloadingSource(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (q) {
        const hay = `${o.orderCode} ${o.customer.fullName} ${o.customer.phone} ${o.customer.district}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!q) return true;
      return `${p.name} ${p.categoryLabel} ${p.origin}`.toLowerCase().includes(q);
    });
  }, [products, productSearch]);

  const buildAdLandingUrl = (slug: string, source = adBuilderPlatform, campaign = adBuilderCampaign) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      product: slug,
      utm_source: source,
      utm_medium: 'paid_social',
      utm_campaign: campaign.trim() || 'bdhridoy_ad',
    });
    return `${origin}/?${params.toString()}`;
  };

  const handleCopyAdUrl = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAdKey(key);
      window.setTimeout(() => setCopiedAdKey(null), 1800);
    } catch {
      setErrorMsg('Could not copy link automatically. Please select and copy it manually.');
    }
  };

  const handleSaveAdSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdSettings(true);
    setAdSettingsSaved(false);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/ad-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adSettings),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not save ad settings.');
      } else {
        setAdSettings(data.adSettings);
        setAdSettingsSaved(true);
        window.setTimeout(() => setAdSettingsSaved(false), 2500);
      }
    } catch {
      setErrorMsg('Network error saving ad pixel settings.');
    } finally {
      setSavingAdSettings(false);
    }
  };

  const handleSiteImageUpload = (
    field: 'logoUrl' | 'heroBannerUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Image file must be under 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSiteSettings((prev) => ({ ...prev, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const persistSiteSettings = async (payload: SiteSettings) => {
    setSavingSiteSettings(true);
    setSiteSettingsSaved(false);
    setErrorMsg('');
    const sanitizedPayload: SiteSettings = {
      ...payload,
      whyChooseItems: payload.whyChooseItems.map((line) => line.trim()).filter(Boolean),
    };
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sanitizedPayload),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not save website design settings.');
      } else {
        const merged = { ...DEFAULT_SITE_SETTINGS, ...data.siteSettings };
        setSiteSettings(merged);
        onSiteSettingsChanged(merged);
        setSiteSettingsSaved(true);
        window.setTimeout(() => setSiteSettingsSaved(false), 3000);
      }
    } catch {
      setErrorMsg('Network error saving website design settings.');
    } finally {
      setSavingSiteSettings(false);
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistSiteSettings(siteSettings);
  };

  const handleResetSiteSettings = async () => {
    setSiteSettings(DEFAULT_SITE_SETTINGS);
    await persistSiteSettings(DEFAULT_SITE_SETTINGS);
  };

  const handleToggleResellerStatus = async (reseller: ResellerAccount) => {
    const nextStatus = reseller.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/resellers/${encodeURIComponent(reseller.id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.resellers)) {
        setResellers(data.resellers);
      }
    } catch {
      setErrorMsg('Could not update reseller status.');
    }
  };

  const handleMarkPayoutPaid = async (payoutId: string) => {
    try {
      const res = await fetch(`/api/admin/reseller-payouts/${encodeURIComponent(payoutId)}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.resellerPayouts)) setResellerPayouts(data.resellerPayouts);
        if (Array.isArray(data.resellers)) setResellers(data.resellers);
      }
    } catch {
      setErrorMsg('Could not confirm payout.');
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'resellers', label: 'Resellers', icon: Store },
    { id: 'promos', label: 'Promo Codes', icon: Tag },
    { id: 'ads', label: 'Ads & Pixels', icon: Megaphone },
    { id: 'design', label: 'Site Design', icon: Palette },
  ];

  const activeTabLabel = navItems.find((n) => n.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141413] flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#141413]/40 lg:hidden"
        />
      )}

      {/* Left Sidebar (240px) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-[#141413]/10 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-[#141413]/10 flex items-center justify-between">
            <span className="font-display text-xl font-semibold tracking-tight text-[#141413]">
              BdHridoyShop
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden p-1.5 text-[#5C5B57] hover:text-[#141413]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Admin workspace navigation" className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#0F523E] text-white'
                      : 'text-[#5C5B57] hover:text-[#141413] hover:bg-[#F2F1ED]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#141413]/10 space-y-2">
          <div className="px-2 pb-1">
            <p className="text-[11px] uppercase tracking-wider text-[#5C5B57]">Signed in</p>
            <p className="text-xs font-medium text-[#141413] truncate">{username}</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadSource}
            disabled={downloadingSource}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#0F523E] bg-[#0F523E]/8 hover:bg-[#0F523E]/15 disabled:opacity-60 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{downloadingSource ? 'Packaging (.zip)...' : 'Download Source (.zip)'}</span>
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#F2F1ED] hover:bg-[#E7E5DE] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>View Storefront</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#5C5B57] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb Left — Actions Right */}
        <header className="h-16 px-4 sm:px-8 bg-white border-b border-[#141413]/10 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 text-[#141413] hover:bg-[#F2F1ED] rounded-lg"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-[#5C5B57]">Admin</span>
              <span className="text-[#5C5B57]" aria-hidden="true">/</span>
              <span className="font-semibold text-[#141413]">{activeTabLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadSource}
              disabled={downloadingSource}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F523E] bg-[#0F523E]/10 hover:bg-[#0F523E]/15 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {downloadingSource ? 'Packaging...' : 'Download Source (.zip)'}
              </span>
              <span className="sm:hidden">
                {downloadingSource ? 'Zip...' : 'Source (.zip)'}
              </span>
            </button>
            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#F2F1ED] hover:bg-[#E7E5DE] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {activeTab === 'inventory' && (
              <button
                type="button"
                onClick={openAddProductModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F523E] hover:bg-[#0B3F30] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg('')} className="underline">
                Dismiss
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* 4-Column Flat KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-[#141413]/10 rounded-xl">
                  <p className="text-xs text-[#5C5B57] mb-1">Gross Order Revenue</p>
                  <p className="font-display text-3xl font-semibold text-[#141413] tabular-nums">
                    {formatBDT(stats.totalRevenueBdt)}
                  </p>
                </div>
                <div className="p-5 bg-white border border-[#141413]/10 rounded-xl">
                  <p className="text-xs text-[#5C5B57] mb-1">Total Orders</p>
                  <p className="font-display text-3xl font-semibold text-[#141413] tabular-nums">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="p-5 bg-white border border-[#141413]/10 rounded-xl">
                  <p className="text-xs text-[#5C5B57] mb-1">Active Shipments</p>
                  <p className="font-display text-3xl font-semibold text-[#0F523E] tabular-nums">
                    {stats.pendingFulfillment}
                  </p>
                </div>
                <div className="p-5 bg-white border border-[#141413]/10 rounded-xl">
                  <p className="text-xs text-[#5C5B57] mb-1">Low Stock Items (≤5)</p>
                  <p className={`font-display text-3xl font-semibold tabular-nums ${stats.lowStockCount > 0 ? 'text-amber-700' : 'text-[#141413]'}`}>
                    {stats.lowStockCount}
                  </p>
                </div>
              </div>

              {/* Recent Orders Compact Table */}
              <div className="bg-white border border-[#141413]/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#141413]/10 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#141413]">Recent Bangladesh Orders</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-medium text-[#0F523E] hover:underline"
                  >
                    Manage All Orders
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#141413]/8 text-[#5C5B57] bg-[#FAFAF8]">
                        <th className="py-3 px-4 font-medium">Order ID</th>
                        <th className="py-3 px-4 font-medium">Customer</th>
                        <th className="py-3 px-4 font-medium">District</th>
                        <th className="py-3 px-4 font-medium">Payment</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 6).map((order) => {
                        const statusMeta = STATUS_LABELS[order.status];
                        return (
                          <tr
                            key={order.orderCode}
                            onClick={() => setInspectOrder(order)}
                            className="border-b border-[#141413]/6 hover:bg-[#FAFAF8] cursor-pointer h-11"
                          >
                            <td className="px-4 font-mono-tabular font-semibold text-[#0F523E]">
                              {order.orderCode}
                            </td>
                            <td className="px-4 font-medium text-[#141413]">
                              {order.customer.fullName}
                            </td>
                            <td className="px-4 text-[#5C5B57]">{order.customer.district}</td>
                            <td className="px-4 text-[#5C5B57] uppercase">{order.payment.method}</td>
                            <td className="px-4">
                              <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${statusMeta.tone}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-4 text-right font-semibold tabular-nums text-[#141413]">
                              {formatBDT(order.pricing.totalBdt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-[#F2F1ED] rounded-lg overflow-x-auto">
                  {(['all', 'confirmed', 'packed', 'in_transit', 'delivered'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        orderStatusFilter === st
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#5C5B57] hover:text-[#141413]'
                      }`}
                    >
                      {st === 'all' ? 'All Orders' : STATUS_LABELS[st].label}
                    </button>
                  ))}
                </div>

                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#5C5B57] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID, name, phone..."
                    className="w-full h-9 pl-8 pr-3 bg-white border border-[#141413]/12 rounded-lg text-xs focus:outline-none focus:border-[#0F523E]"
                  />
                </div>
              </div>

              <div className="bg-white border border-[#141413]/10 rounded-xl overflow-hidden">
                {filteredOrders.length === 0 ? (
                  <div className="py-16 text-center text-sm text-[#5C5B57]">
                    No orders match your current filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#141413]/8 text-[#5C5B57] bg-[#FAFAF8]">
                          <th className="py-3 px-4 font-medium">Order ID</th>
                          <th className="py-3 px-4 font-medium">Customer & Phone</th>
                          <th className="py-3 px-4 font-medium">Destination</th>
                          <th className="py-3 px-4 font-medium">Payment</th>
                          <th className="py-3 px-4 font-medium">Fulfillment Stage</th>
                          <th className="py-3 px-4 font-medium text-right">Total</th>
                          <th className="py-3 px-4 font-medium text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.orderCode} className="border-b border-[#141413]/6 hover:bg-[#FAFAF8] h-12">
                            <td className="px-4 font-mono-tabular font-semibold text-[#0F523E]">
                              {order.orderCode}
                            </td>
                            <td className="px-4">
                              <p className="font-medium text-[#141413]">{order.customer.fullName}</p>
                              <p className="text-[11px] font-mono-tabular text-[#5C5B57]">{order.customer.phone}</p>
                            </td>
                            <td className="px-4 text-[#5C5B57]">
                              {order.customer.district}, {order.customer.division}
                            </td>
                            <td className="px-4 text-[#5C5B57]">{order.payment.statusLabel}</td>
                            <td className="px-4">
                              <select
                                value={order.status}
                                onChange={(e) =>
                                  handleStatusChange(order.orderCode, e.target.value as OrderStatus)
                                }
                                aria-label={`Update status for ${order.orderCode}`}
                                className="h-8 px-2 bg-[#FAFAF8] border border-[#141413]/15 rounded-md text-xs font-medium text-[#141413] focus:outline-none focus:border-[#0F523E]"
                              >
                                <option value="confirmed">Confirmed</option>
                                <option value="packed">Packed in Dhaka</option>
                                <option value="in_transit">Out for Courier</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </td>
                            <td className="px-4 text-right font-semibold tabular-nums text-[#141413]">
                              {formatBDT(order.pricing.totalBdt)}
                            </td>
                            <td className="px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setInspectOrder(order)}
                                className="text-[#0F523E] font-medium hover:underline"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative sm:w-72">
                  <Search className="w-3.5 h-3.5 text-[#5C5B57] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter catalog items..."
                    className="w-full h-9 pl-8 pr-3 bg-white border border-[#141413]/12 rounded-lg text-xs focus:outline-none focus:border-[#0F523E]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[#5C5B57] tabular-nums">
                    {filteredProducts.length} products in catalog
                  </p>
                  <button
                    type="button"
                    onClick={openAddProductModal}
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 text-xs font-medium text-white bg-[#0F523E] hover:bg-[#0B3F30] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add New Product</span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#141413]/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#141413]/8 text-[#5C5B57] bg-[#FAFAF8]">
                        <th className="py-3 px-4 font-medium">Product</th>
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Price (BDT)</th>
                        <th className="py-3 px-4 font-medium text-center">Stock</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="border-b border-[#141413]/6 hover:bg-[#FAFAF8] h-14">
                          <td className="px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-[#F2F1ED] shrink-0">
                                <ResilientImage
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-[#141413] truncate max-w-[200px]">
                                    {product.name}
                                  </p>
                                  {product.adBadge && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#133475] text-white text-[10px] font-semibold">
                                      {product.adBadge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#5C5B57]">
                                  {product.sourcePlatform && product.sourcePlatform !== 'BdHridoyShop'
                                    ? `${product.sourcePlatform} · ${product.actionMode === 'external' ? 'Visit Store' : 'Cart + Store'}`
                                    : product.origin}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 text-[#5C5B57]">{product.categoryLabel}</td>
                          <td className="px-4 text-[#0F523E] font-medium">{product.availabilityNote}</td>
                          <td className="px-4 text-right font-semibold tabular-nums text-[#141413]">
                            {formatBDT(product.priceBdt)}
                          </td>
                          <td className="px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickStockDelta(product, -1)}
                                aria-label={`Decrease stock for ${product.name}`}
                                className="w-6 h-6 rounded border border-[#141413]/15 hover:bg-[#F2F1ED] flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className={`w-8 text-center font-mono-tabular font-semibold ${product.stock <= 5 ? 'text-amber-700' : 'text-[#141413]'}`}>
                                {product.stock}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickStockDelta(product, 1)}
                                aria-label={`Increase stock for ${product.name}`}
                                className="w-6 h-6 rounded border border-[#141413]/15 hover:bg-[#F2F1ED] flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 text-right space-x-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyAdUrl(
                                  product.id,
                                  buildAdLandingUrl(product.slug, adSettings.defaultUtmSource),
                                )
                              }
                              className="inline-flex items-center gap-1 text-[#133475] font-medium hover:underline"
                            >
                              {copiedAdKey === product.id ? (
                                <>
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                  <span>Copied Ad Link</span>
                                </>
                              ) : (
                                <>
                                  <Link2 className="w-3 h-3" aria-hidden="true" />
                                  <span>Ad Link</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProductModal(product)}
                              className="text-[#0F523E] font-medium hover:underline"
                            >
                              Edit
                            </button>
                            {confirmDeleteId === product.id ? (
                              <span className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteId(null);
                                    handleDeleteProduct(product.id);
                                  }}
                                  className="text-red-700 font-semibold hover:underline"
                                >
                                  Confirm Remove
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[#5C5B57] hover:underline"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(product.id)}
                                aria-label={`Remove ${product.name}`}
                                className="text-red-700/80 hover:text-red-700 font-medium transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PROMO CODES TAB */}
          {activeTab === 'promos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white border border-[#141413]/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#141413]/10">
                  <h2 className="text-sm font-semibold text-[#141413]">Active Promo Codes</h2>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#141413]/8 text-[#5C5B57] bg-[#FAFAF8]">
                      <th className="py-3 px-4 font-medium">Code</th>
                      <th className="py-3 px-4 font-medium">Benefit</th>
                      <th className="py-3 px-4 font-medium text-right">Min Spend</th>
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((promo) => (
                      <tr key={promo.code} className="border-b border-[#141413]/6 h-11">
                        <td className="px-4 font-mono-tabular font-semibold text-[#0F523E]">
                          {promo.code}
                        </td>
                        <td className="px-4 text-[#141413]">
                          {promo.type === 'percent'
                            ? `${promo.value}% Off`
                            : `${formatBDT(promo.value)} Flat Off`}{' '}
                          <span className="text-[#5C5B57]">· {promo.label}</span>
                        </td>
                        <td className="px-4 text-right tabular-nums text-[#5C5B57]">
                          {formatBDT(promo.minSubtotal)}
                        </td>
                        <td className="px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(promo.code)}
                            aria-label={`Delete promo ${promo.code}`}
                            className="p-1.5 text-[#5C5B57] hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleCreatePromo}
                className="lg:col-span-5 p-5 bg-white border border-[#141413]/10 rounded-xl space-y-4"
              >
                <h3 className="text-sm font-semibold text-[#141413]">Create Campaign Promo</h3>
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="EID20"
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Discount Type</label>
                    <select
                      value={promoType}
                      onChange={(e) => setPromoType(e.target.value as 'percent' | 'flat')}
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Flat Amount (৳)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Value</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={promoValue}
                      onChange={(e) => setPromoValue(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Min Order (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={promoMin}
                      onChange={(e) => setPromoMin(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Label</label>
                    <input
                      type="text"
                      value={promoLabel}
                      onChange={(e) => setPromoLabel(e.target.value)}
                      placeholder="Festival Privilege"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="w-full h-10 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {savingPromo ? 'Saving...' : 'Save Promo Code'}
                </button>
              </form>

              <div className="lg:col-span-12 bg-white border border-[#141413]/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#141413]/10 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#141413]">Newsletter Subscribers</h2>
                  <span className="text-xs text-[#5C5B57] tabular-nums">
                    {subscribers.length} captured emails
                  </span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#141413]/8 text-[#5C5B57] bg-[#FAFAF8]">
                      <th className="py-3 px-4 font-medium">Customer Email</th>
                      <th className="py-3 px-4 font-medium text-right">Subscribed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.email} className="border-b border-[#141413]/6 h-10">
                        <td className="px-4 font-medium text-[#141413]">{sub.email}</td>
                        <td className="px-4 text-right text-[#5C5B57] tabular-nums">
                          {sub.subscribedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADS & PIXELS TAB */}
          {activeTab === 'ads' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Ad Campaign Landing URL Builder */}
              <div className="lg:col-span-6 p-6 bg-white border border-[#141413]/10 rounded-xl space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#141413]">
                    Ad Campaign URL Builder (Facebook / TikTok / Google Ads)
                  </h2>
                  <p className="text-xs text-[#5C5B57] mt-1">
                    Generate a direct product landing link for your paid ads. When customers click
                    your ad, BdHridoyShop opens straight to that product.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Select Product to Promote</label>
                  <select
                    value={adBuilderProductId}
                    onChange={(e) => setAdBuilderProductId(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatBDT(p.priceBdt)}
                        {p.sourcePlatform ? ` · ${p.sourcePlatform}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Ad Platform</label>
                    <select
                      value={adBuilderPlatform}
                      onChange={(e) => setAdBuilderPlatform(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    >
                      <option value="facebook">Facebook / Meta Ads</option>
                      <option value="instagram">Instagram Ads</option>
                      <option value="tiktok">TikTok Ads</option>
                      <option value="google">Google Ads</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Campaign Name</label>
                    <input
                      type="text"
                      value={adBuilderCampaign}
                      onChange={(e) => setAdBuilderCampaign(e.target.value)}
                      placeholder="bd_promo_2026"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {(() => {
                  const chosen =
                    products.find((p) => p.id === adBuilderProductId) ?? products[0];
                  if (!chosen) return null;
                  const finalUrl = buildAdLandingUrl(chosen.slug);
                  return (
                    <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#141413]/10 space-y-2">
                      <p className="text-[11px] font-medium text-[#5C5B57]">
                        Ready-to-Run Ad Destination URL
                      </p>
                      <p className="text-xs font-mono-tabular text-[#133475] break-all">
                        {finalUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopyAdUrl('builder', finalUrl)}
                        className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-[#133475] hover:bg-[#0E2758] text-white text-xs font-medium transition-colors"
                      >
                        {copiedAdKey === 'builder' ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copied Ad URL!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copy Ad Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Ad Tracking Pixels Configuration */}
              <form
                onSubmit={handleSaveAdSettings}
                className="lg:col-span-6 p-6 bg-white border border-[#141413]/10 rounded-xl space-y-4"
              >
                <div>
                  <h2 className="text-sm font-semibold text-[#141413]">
                    Ad Pixel &amp; Conversion Tracking
                  </h2>
                  <p className="text-xs text-[#5C5B57] mt-1">
                    Add your pixel IDs so PageView, ViewContent, AddToCart, Purchase, and Daraz/Amazon
                    outbound click events fire automatically when running ads.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">
                    Meta (Facebook) Pixel ID
                  </label>
                  <input
                    type="text"
                    value={adSettings.metaPixelId}
                    onChange={(e) =>
                      setAdSettings((s) => ({ ...s, metaPixelId: e.target.value }))
                    }
                    placeholder="e.g. 123456789012345"
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">
                    Google Ads / GA4 Tag ID
                  </label>
                  <input
                    type="text"
                    value={adSettings.googleTagId}
                    onChange={(e) =>
                      setAdSettings((s) => ({ ...s, googleTagId: e.target.value }))
                    }
                    placeholder="e.g. G-XXXXXXXXXX or AW-XXXXXXXXX"
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      TikTok Pixel ID (optional)
                    </label>
                    <input
                      type="text"
                      value={adSettings.tiktokPixelId}
                      onChange={(e) =>
                        setAdSettings((s) => ({ ...s, tiktokPixelId: e.target.value }))
                      }
                      placeholder="e.g. CXXXXXXXXXXXX"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      Default Ad Source
                    </label>
                    <select
                      value={adSettings.defaultUtmSource}
                      onChange={(e) =>
                        setAdSettings((s) => ({ ...s, defaultUtmSource: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="google">Google Ads</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {adSettingsSaved ? (
                    <span className="text-xs font-medium text-[#0F523E]">
                      Pixel settings saved &amp; active on storefront!
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#5C5B57]">
                      Leave blank if not using a network yet
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={savingAdSettings}
                    className="px-5 h-10 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {savingAdSettings ? 'Saving...' : 'Save Pixel Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SITE DESIGN CUSTOMIZATION TAB */}
          {activeTab === 'design' && (
            <form onSubmit={handleSaveSiteSettings} className="space-y-6">
              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#141413]">
                    Website Customization &amp; Storefront Design
                  </h2>
                  <p className="text-xs text-[#5C5B57] mt-0.5">
                    Edit your store branding, theme colors, logo, hero banner, special offer, sidebar &amp; footer live without touching code.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetSiteSettings}
                    disabled={savingSiteSettings}
                    className="h-9 px-3.5 rounded-lg border border-[#141413]/15 bg-[#FAFAF8] hover:bg-[#F2F1ED] text-xs font-medium text-[#141413] transition-colors"
                  >
                    Reset to Default
                  </button>
                  <button
                    type="submit"
                    disabled={savingSiteSettings}
                    className="h-9 px-4 rounded-lg bg-[#0F523E] hover:bg-[#0B3F30] text-white text-xs font-semibold transition-colors"
                  >
                    {savingSiteSettings ? 'Saving...' : 'Save Website Design'}
                  </button>
                </div>
              </div>

              {siteSettingsSaved && (
                <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#0F523E] flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Website design updated! Live storefront now reflects your changes.</span>
                </div>
              )}

              {/* Brand Identity & Theme Colors */}
              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#141413]">
                  1. Brand Identity, Logo &amp; Theme Colors
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Store Name</label>
                    <input
                      type="text"
                      required
                      value={siteSettings.storeName}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, storeName: e.target.value }))
                      }
                      placeholder="BdHridoyShop"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Brand Tagline</label>
                    <input
                      type="text"
                      value={siteSettings.tagline}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, tagline: e.target.value }))
                      }
                      placeholder="Shop Smart... Live Better..."
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Logo Upload / URL */}
                <div className="space-y-2">
                  <label className="block text-xs text-[#5C5B57]">
                    Custom Logo Image (Upload or Image URL — leave blank for default icon)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={siteSettings.logoUrl.startsWith('data:') ? '' : siteSettings.logoUrl}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, logoUrl: e.target.value }))
                      }
                      placeholder="https://... or upload logo image"
                      className="flex-1 h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                    <label className="inline-flex items-center justify-center px-3.5 h-10 bg-[#F2F1ED] hover:bg-[#E7E5DE] text-xs font-medium text-[#141413] rounded-lg cursor-pointer whitespace-nowrap">
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSiteImageUpload('logoUrl', e)}
                        className="sr-only"
                      />
                    </label>
                    {siteSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setSiteSettings((s) => ({ ...s, logoUrl: '' }))}
                        className="px-3 h-10 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {siteSettings.logoUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={siteSettings.logoUrl}
                        alt="Custom store logo preview"
                        className="w-10 h-10 rounded-lg object-cover border border-[#141413]/10"
                      />
                      <span className="text-[11px] text-[#0F523E]">Custom logo active</span>
                    </div>
                  )}
                </div>

                {/* Color Pickers + Swatches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#141413]/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[#141413]">
                        Primary Color (Top Bar, Links &amp; Footer)
                      </label>
                      <span className="text-[11px] font-mono-tabular text-[#5C5B57]">
                        {siteSettings.primaryColor}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        aria-label="Primary brand color picker"
                        value={siteSettings.primaryColor}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, primaryColor: e.target.value }))
                        }
                        className="w-10 h-9 p-0.5 rounded border border-[#141413]/15 bg-white cursor-pointer"
                      />
                      <input
                        type="text"
                        value={siteSettings.primaryColor}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, primaryColor: e.target.value }))
                        }
                        className="w-28 h-9 px-2.5 bg-white border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Royal Navy"
                          onClick={() => setSiteSettings((s) => ({ ...s, primaryColor: '#133475' }))}
                          className="w-6 h-6 rounded-full bg-[#133475] border border-black/15"
                        />
                        <button
                          type="button"
                          title="Bengal Emerald"
                          onClick={() => setSiteSettings((s) => ({ ...s, primaryColor: '#0F523E' }))}
                          className="w-6 h-6 rounded-full bg-[#0F523E] border border-black/15"
                        />
                        <button
                          type="button"
                          title="Slate Ink"
                          onClick={() => setSiteSettings((s) => ({ ...s, primaryColor: '#1E293B' }))}
                          className="w-6 h-6 rounded-full bg-[#1E293B] border border-black/15"
                        />
                        <button
                          type="button"
                          title="Deep Plum"
                          onClick={() => setSiteSettings((s) => ({ ...s, primaryColor: '#5B21B6' }))}
                          className="w-6 h-6 rounded-full bg-[#5B21B6] border border-black/15"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#141413]/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[#141413]">
                        Accent Color (Buttons, Badges &amp; Highlights)
                      </label>
                      <span className="text-[11px] font-mono-tabular text-[#5C5B57]">
                        {siteSettings.accentColor}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        aria-label="Accent brand color picker"
                        value={siteSettings.accentColor}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, accentColor: e.target.value }))
                        }
                        className="w-10 h-9 p-0.5 rounded border border-[#141413]/15 bg-white cursor-pointer"
                      />
                      <input
                        type="text"
                        value={siteSettings.accentColor}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, accentColor: e.target.value }))
                        }
                        className="w-28 h-9 px-2.5 bg-white border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Crimson Red"
                          onClick={() => setSiteSettings((s) => ({ ...s, accentColor: '#E11D2E' }))}
                          className="w-6 h-6 rounded-full bg-[#E11D2E] border border-black/15"
                        />
                        <button
                          type="button"
                          title="Warm Amber"
                          onClick={() => setSiteSettings((s) => ({ ...s, accentColor: '#D97706' }))}
                          className="w-6 h-6 rounded-full bg-[#D97706] border border-black/15"
                        />
                        <button
                          type="button"
                          title="Electric Blue"
                          onClick={() => setSiteSettings((s) => ({ ...s, accentColor: '#2563EB' }))}
                          className="w-6 h-6 rounded-full bg-[#2563EB] border border-black/15"
                        />
                        <button
                          type="button"
                          title="Emerald Green"
                          onClick={() => setSiteSettings((s) => ({ ...s, accentColor: '#059669' }))}
                          className="w-6 h-6 rounded-full bg-[#059669] border border-black/15"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Utility Bar */}
              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#141413]">2. Top Announcement Bar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Left Notice</label>
                    <input
                      type="text"
                      value={siteSettings.topBarText1}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, topBarText1: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Center Notice</label>
                    <input
                      type="text"
                      value={siteSettings.topBarText2}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, topBarText2: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Right Notice</label>
                    <input
                      type="text"
                      value={siteSettings.topBarText3}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, topBarText3: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Hero Banner & Badges */}
              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#141413]">3. Hero Banner &amp; Offer Callouts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Hero Eyebrow Text</label>
                    <input
                      type="text"
                      value={siteSettings.heroEyebrow}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, heroEyebrow: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Hero Main Headline</label>
                    <input
                      type="text"
                      value={siteSettings.heroHeadline}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, heroHeadline: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Hero Subtitle</label>
                    <input
                      type="text"
                      value={siteSettings.heroSubtitle}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, heroSubtitle: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Yellow Floating Badge</label>
                    <input
                      type="text"
                      value={siteSettings.heroBadgeTop}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, heroBadgeTop: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Accent Floating Callout</label>
                    <input
                      type="text"
                      value={siteSettings.heroBadgeMain}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, heroBadgeMain: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-[#5C5B57]">
                    Custom Hero Background Banner (Upload or Image URL — optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={
                        siteSettings.heroBannerUrl.startsWith('data:')
                          ? ''
                          : siteSettings.heroBannerUrl
                      }
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, heroBannerUrl: e.target.value }))
                      }
                      placeholder="https://... or upload hero background image"
                      className="flex-1 h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                    <label className="inline-flex items-center justify-center px-3.5 h-10 bg-[#F2F1ED] hover:bg-[#E7E5DE] text-xs font-medium text-[#141413] rounded-lg cursor-pointer whitespace-nowrap">
                      <span>Upload Banner</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSiteImageUpload('heroBannerUrl', e)}
                        className="sr-only"
                      />
                    </label>
                    {siteSettings.heroBannerUrl && (
                      <button
                        type="button"
                        onClick={() => setSiteSettings((s) => ({ ...s, heroBannerUrl: '' }))}
                        className="px-3 h-10 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {siteSettings.heroBannerUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={siteSettings.heroBannerUrl}
                        alt="Custom hero banner preview"
                        className="w-24 h-12 rounded-lg object-cover border border-[#141413]/10"
                      />
                      <span className="text-[11px] text-[#0F523E]">Custom hero banner active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Offer & Why Choose Sidebar */}
              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#141413]">
                  4. Special Offer Banner &amp; Why Choose Sidebar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Offer Badge</label>
                    <input
                      type="text"
                      value={siteSettings.specialOfferBadge}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, specialOfferBadge: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Offer Headline</label>
                    <input
                      type="text"
                      value={siteSettings.specialOfferTitle}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, specialOfferTitle: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Offer Subtitle</label>
                    <input
                      type="text"
                      value={siteSettings.specialOfferSubtitle}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, specialOfferSubtitle: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Auto Promo Code</label>
                    <input
                      type="text"
                      value={siteSettings.specialOfferPromoCode}
                      onChange={(e) =>
                        setSiteSettings((s) => ({
                          ...s,
                          specialOfferPromoCode: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs uppercase font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#5C5B57] mb-1">Sidebar Title</label>
                      <input
                        type="text"
                        value={siteSettings.whyChooseTitle}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, whyChooseTitle: e.target.value }))
                        }
                        className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5C5B57] mb-1">Sidebar Sign-Off Note</label>
                      <input
                        type="text"
                        value={siteSettings.whyChooseFooter}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, whyChooseFooter: e.target.value }))
                        }
                        className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      Why Choose Bullet Points (one per line)
                    </label>
                    <textarea
                      rows={4}
                      value={siteSettings.whyChooseItems.join('\n')}
                      onChange={(e) =>
                        setSiteSettings((s) => ({
                          ...s,
                          whyChooseItems: e.target.value.split('\n'),
                        }))
                      }
                      className="w-full p-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Contact, Footer & Section Visibility */}
              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#141413]">
                  5. Contact Details, Footer &amp; Section Toggles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      WhatsApp / Support Number
                    </label>
                    <input
                      type="text"
                      value={siteSettings.whatsappNumber}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, whatsappNumber: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Store Address</label>
                    <input
                      type="text"
                      value={siteSettings.addressText}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, addressText: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      bKash Payment Number
                    </label>
                    <input
                      type="text"
                      value={siteSettings.bkashNumber}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, bkashNumber: e.target.value }))
                      }
                      placeholder="01700-889900"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      Nagad Payment Number
                    </label>
                    <input
                      type="text"
                      value={siteSettings.nagadNumber}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, nagadNumber: e.target.value }))
                      }
                      placeholder="01700-889900"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      Rocket (DBBL) Number
                    </label>
                    <input
                      type="text"
                      value={siteSettings.rocketNumber}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, rocketNumber: e.target.value }))
                      }
                      placeholder="01700-8899001"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Footer About Text</label>
                    <input
                      type="text"
                      value={siteSettings.footerDescription}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, footerDescription: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">Copyright Line</label>
                    <input
                      type="text"
                      value={siteSettings.copyrightText}
                      onChange={(e) =>
                        setSiteSettings((s) => ({ ...s, copyrightText: e.target.value }))
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#141413]/10">
                  <p className="text-xs font-medium text-[#141413] mb-2.5">
                    Storefront Section Visibility
                  </p>
                  <div className="flex flex-wrap gap-5 text-xs text-[#141413]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettings.showWhyChoose}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, showWhyChoose: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#0F523E]"
                      />
                      <span>Show &ldquo;Why Choose&rdquo; Sidebar</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettings.showPromoBanner}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, showPromoBanner: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#0F523E]"
                      />
                      <span>Show Special Offer Banner</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettings.showNewsletter}
                        onChange={(e) =>
                          setSiteSettings((s) => ({ ...s, showNewsletter: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#0F523E]"
                      />
                      <span>Show Newsletter Subscription Box</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingSiteSettings}
                    className="px-5 h-10 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {savingSiteSettings ? 'Saving...' : 'Save Website Design'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* RESELLERS TAB */}
          {activeTab === 'resellers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#141413]/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#141413]/10 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#141413]">
                      Registered Resellers ({resellers.length})
                    </h2>
                    <p className="text-xs text-[#5C5B57] mt-0.5">
                      Resellers sign up at /reseller, promote products at wholesale margin, and submit customer orders.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#141413]/10 text-[#5C5B57] bg-[#FAFAF8]">
                        <th className="py-3 px-4 font-medium">Code</th>
                        <th className="py-3 px-4 font-medium">Shop &amp; Owner</th>
                        <th className="py-3 px-4 font-medium">Payout Account</th>
                        <th className="py-3 px-4 font-medium">Withdrawn</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141413]/10">
                      {resellers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#5C5B57]">
                            No resellers registered yet. Share your /reseller link to onboard partners!
                          </td>
                        </tr>
                      ) : (
                        resellers.map((r) => (
                          <tr key={r.id}>
                            <td className="py-3 px-4 font-mono-tabular font-semibold text-[#0F523E]">
                              {r.code}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-[#141413]">{r.shopName}</p>
                              <p className="text-[11px] text-[#5C5B57] font-mono-tabular">
                                {r.fullName} · {r.phone}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-mono-tabular">
                              {r.payoutMethod.toUpperCase()} · {r.payoutNumber}
                            </td>
                            <td className="py-3 px-4 tabular-nums font-semibold">
                              {formatBDT(r.withdrawnBdt)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  r.status === 'active' ? 'text-[#0F523E]' : 'text-red-700'
                                }`}
                              >
                                {r.status === 'active' ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleResellerStatus(r)}
                                className="px-3 py-1.5 rounded-lg border border-[#141413]/15 bg-[#FAFAF8] hover:bg-[#F2F1ED] text-[11px] font-medium text-[#141413]"
                              >
                                {r.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#141413]/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#141413]/10">
                  <h2 className="text-sm font-semibold text-[#141413]">
                    Reseller Withdrawal Requests ({resellerPayouts.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#141413]/10 text-[#5C5B57] bg-[#FAFAF8]">
                        <th className="py-3 px-4 font-medium">Request ID</th>
                        <th className="py-3 px-4 font-medium">Reseller</th>
                        <th className="py-3 px-4 font-medium">Wallet</th>
                        <th className="py-3 px-4 font-medium">Amount</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141413]/10">
                      {resellerPayouts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#5C5B57]">
                            No reseller payout requests yet.
                          </td>
                        </tr>
                      ) : (
                        resellerPayouts.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-mono-tabular font-semibold">{p.id}</td>
                            <td className="py-3 px-4">
                              {p.shopName} ({p.resellerCode})
                            </td>
                            <td className="py-3 px-4 font-mono-tabular">
                              {p.method.toUpperCase()} · {p.accountNumber}
                            </td>
                            <td className="py-3 px-4 tabular-nums font-semibold">
                              {formatBDT(p.amountBdt)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  p.status === 'paid' ? 'text-[#0F523E]' : 'text-amber-700'
                                }`}
                              >
                                {p.status === 'paid' ? `Paid (${p.paidAt})` : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {p.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPayoutPaid(p.id)}
                                  className="px-3 py-1.5 rounded-lg bg-[#0F523E] hover:bg-[#0B3F30] text-white text-[11px] font-semibold"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Order Inspector Modal */}
      {inspectOrder && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/50">
          <div className="bg-white rounded-2xl border border-[#141413]/10 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <div>
                <p className="text-xs font-mono-tabular font-semibold text-[#0F523E]">
                  ORDER #{inspectOrder.orderCode}
                </p>
                <p className="text-sm font-semibold text-[#141413]">{inspectOrder.customer.fullName}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="p-2 text-[#5C5B57] hover:text-[#141413]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="text-xs space-y-1.5 text-[#5C5B57]">
              <p>
                <span className="font-medium text-[#141413]">Phone:</span>{' '}
                <span className="font-mono-tabular">{inspectOrder.customer.phone}</span>
              </p>
              <p>
                <span className="font-medium text-[#141413]">Address:</span>{' '}
                {inspectOrder.customer.areaAddress}, {inspectOrder.customer.district},{' '}
                {inspectOrder.customer.division}
              </p>
              <p>
                <span className="font-medium text-[#141413]">Payment:</span>{' '}
                {inspectOrder.payment.statusLabel}
              </p>
            </div>
            <div className="border-t border-[#141413]/10 pt-3 space-y-2 text-xs">
              {inspectOrder.items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex justify-between">
                  <span>
                    {item.name} ({item.variantLabel}) × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatBDT(item.priceBdt * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#141413]/10 flex justify-between font-semibold text-sm text-[#141413]">
                <span>Total</span>
                <span className="tabular-nums">{formatBDT(inspectOrder.pricing.totalBdt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddProduct && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/50">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl border border-[#141413]/10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h3 className="text-base font-semibold text-[#141413]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProduct(false)}
                className="p-2 text-[#5C5B57] hover:text-[#141413]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Import from Daraz / Amazon / External Store */}
            <div className="p-3.5 rounded-xl bg-[#EAF5FF]/70 border border-[#133475]/15 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#133475]">
                <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Import Product from Daraz, Amazon, or Any Store Link</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importUrlInput}
                  onChange={(e) => setImportUrlInput(e.target.value)}
                  placeholder="Paste https://www.daraz.com.bd/... or https://www.amazon.com/..."
                  className="flex-1 h-9 px-3 bg-white border border-[#133475]/20 rounded-lg text-xs focus:outline-none focus:border-[#133475]"
                />
                <button
                  type="button"
                  onClick={handleImportFromUrl}
                  disabled={importingUrl}
                  className="px-3.5 h-9 rounded-lg bg-[#133475] hover:bg-[#0E2758] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {importingUrl ? 'Fetching...' : 'Fetch Info'}
                </button>
              </div>
              {importNotice && (
                <p className="text-[11px] text-[#133475] leading-snug">{importNotice}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#5C5B57] mb-1">Product Title</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Wireless Earbuds from Daraz / Amazon"
                className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as Product['category'])}
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                >
                  <option value="mobiles">Mobiles</option>
                  <option value="laptops">Laptops &amp; Carry</option>
                  <option value="accessories">Accessories</option>
                  <option value="fashion">Fashion</option>
                  <option value="home-living">Home &amp; Living</option>
                  <option value="beauty">Beauty &amp; Care</option>
                  <option value="sports">Sports</option>
                  <option value="gifts">Gifts</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Studio Image Preset</label>
                <select
                  value={formImageKey}
                  onChange={(e) => setFormImageKey(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                >
                  {Object.keys(PRODUCT_IMAGE_MAP).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Sale Price (৳)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Regular Price (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={formCompareAt}
                  onChange={(e) => setFormCompareAt(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Wholesale (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={formResellerPrice}
                  onChange={(e) => setFormResellerPrice(e.target.value)}
                  placeholder="Auto -15%"
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Stock</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Tag</label>
                <select
                  value={formAvailability}
                  onChange={(e) =>
                    setFormAvailability(e.target.value as 'In Stock' | 'Limited Run')
                  }
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Limited Run">Limited Run</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Source Website</label>
                <input
                  type="text"
                  list="source-platform-list"
                  value={formSourcePlatform}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormSourcePlatform(val);
                  }}
                  placeholder="Daraz, Amazon, BdHridoyShop..."
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                />
                <datalist id="source-platform-list">
                  <option value="BdHridoyShop" />
                  <option value="Daraz" />
                  <option value="Amazon" />
                  <option value="AliExpress" />
                  <option value="Pickaboo" />
                  <option value="StarTech" />
                  <option value="Chaldal" />
                  <option value="Rokomari" />
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Button Mode</label>
                <select
                  value={formActionMode}
                  onChange={(e) =>
                    setFormActionMode(e.target.value as 'direct' | 'external' | 'both')
                  }
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                >
                  <option value="direct">Direct Add to Cart</option>
                  <option value="external">Visit External Store</option>
                  <option value="both">Both (Cart + Visit Store)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5C5B57] mb-1">Ad Badge</label>
                <select
                  value={formAdBadge}
                  onChange={(e) => setFormAdBadge(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                >
                  <option value="">None</option>
                  <option value="Sponsored">Sponsored</option>
                  <option value="Ad">Ad</option>
                  <option value="Hot Deal">Hot Deal</option>
                  <option value="Best Seller">Best Seller</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#5C5B57] mb-1">
                External Store Link (Daraz / Amazon Affiliate or Product URL — optional)
              </label>
              <input
                type="text"
                value={formExternalUrl}
                onChange={(e) => setFormExternalUrl(e.target.value)}
                placeholder="https://www.daraz.com.bd/products/... or https://amzn.to/..."
                className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-[#5C5B57]">
                Custom Product Photo (Upload or Image URL — optional)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={formCustomImage.startsWith('data:') ? '' : formCustomImage}
                  onChange={(e) => setFormCustomImage(e.target.value)}
                  placeholder="https://... or upload image file"
                  className="flex-1 h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                />
                <label className="inline-flex items-center justify-center px-3 h-10 bg-[#F2F1ED] hover:bg-[#E7E5DE] text-xs font-medium text-[#141413] rounded-lg cursor-pointer whitespace-nowrap">
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileSelect}
                    className="sr-only"
                  />
                </label>
              </div>
              {formCustomImage && (
                <div className="flex items-center justify-between text-[11px] text-[#0F523E]">
                  <span>Custom photo attached</span>
                  <button
                    type="button"
                    onClick={() => setFormCustomImage('')}
                    className="underline text-red-700"
                  >
                    Clear custom photo
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#5C5B57] mb-1">Origin / Brand Note</label>
              <input
                type="text"
                value={formOrigin}
                onChange={(e) => setFormOrigin(e.target.value)}
                className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-[#5C5B57] mb-1">Short Description</label>
              <textarea
                rows={3}
                required
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full p-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProduct(false)}
                className="px-4 h-10 text-xs font-medium text-[#5C5B57] hover:text-[#141413]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="px-5 h-10 bg-[#0F523E] hover:bg-[#0B3F30] text-white text-xs font-medium rounded-lg"
              >
                {savingProduct ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
