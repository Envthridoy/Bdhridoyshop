import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Package,
  RefreshCw,
  Search,
  Share2,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react';
import { resolveProductImage } from '../../data/catalog.ts';
import type {
  Order,
  PaymentMethod,
  Product,
  ResellerAccount,
  ResellerDashboardStats,
  ResellerPayoutRequest,
  SiteSettings,
} from '../../types/store.ts';
import {
  BANGLADESH_DIVISIONS,
  DELIVERY_ZONES,
  calculateDeliveryFee,
  formatBDT,
  inferZoneFromDistrict,
  isValidBdPhone,
} from '../../utils/format.ts';
import { ResilientImage } from '../ResilientImage.tsx';

interface ResellerPortalProps {
  siteSettings: SiteSettings;
  onBackToStore: () => void;
}

type ResellerTab = 'catalog' | 'order' | 'earnings';

const RESELLER_TOKEN_KEY = 'bdhridoyshop_reseller_token_v1';

export function ResellerPortal({ siteSettings, onBackToStore }: ResellerPortalProps) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(RESELLER_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  // Auth form states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regPayoutMethod, setRegPayoutMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [regPayoutNumber, setRegPayoutNumber] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard states
  const [activeTab, setActiveTab] = useState<ResellerTab>('catalog');
  const [reseller, setReseller] = useState<ResellerAccount | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<ResellerPayoutRequest[]>([]);
  const [stats, setStats] = useState<ResellerDashboardStats>({
    totalOrders: 0,
    deliveredProfitBdt: 0,
    pendingProfitBdt: 0,
    availableBalanceBdt: 0,
    withdrawnBdt: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Catalog search & copy feedback
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reseller dropship order form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custDivision, setCustDivision] = useState('Dhaka');
  const [custDistrict, setCustDistrict] = useState('Dhaka Metro');
  const [custAddress, setCustAddress] = useState('');
  const [custPayment, setCustPayment] = useState<PaymentMethod>('cod');
  const [custTrxId, setCustTrxId] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccessCode, setOrderSuccessCode] = useState('');

  // Payout request states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');

  const handleLogout = useCallback(() => {
    setToken(null);
    setReseller(null);
    try {
      window.localStorage.removeItem(RESELLER_TOKEN_KEY);
    } catch {
      // ignore
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/reseller/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not load reseller workspace.');
      } else {
        setReseller(data.reseller);
        const hydrated = (data.products as Product[]).map((p) => ({
          ...p,
          image: resolveProductImage(p),
        }));
        setProducts(hydrated);
        setOrders(data.orders || []);
        setPayouts(data.payouts || []);
        setStats(data.stats);
        if (hydrated.length > 0 && !selectedProductId) {
          setSelectedProductId(hydrated[0].id);
          setSelectedVariantId(hydrated[0].variants[0]?.id || 'standard');
          setSellingPriceInput(String(hydrated[0].priceBdt));
        }
        if (data.reseller) {
          setWithdrawMethod(data.reseller.payoutMethod);
          setWithdrawAccount(data.reseller.payoutNumber);
        }
      }
    } catch {
      setErrorMsg('Network error loading reseller data.');
    } finally {
      setLoading(false);
    }
  }, [token, handleLogout, selectedProductId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/reseller/login' : '/api/reseller/register';
      const payload =
        authMode === 'login'
          ? { phone: authPhone.trim(), password: authPassword }
          : {
              fullName: regName.trim(),
              shopName: regShopName.trim(),
              phone: authPhone.trim(),
              password: authPassword,
              payoutMethod: regPayoutMethod,
              payoutNumber: (regPayoutNumber || authPhone).trim(),
            };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setAuthError(
          'Backend API (/api) is not active on this host. Deploy full project with netlify/functions or Node server.',
        );
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
      } else {
        setToken(data.token);
        setReseller(data.reseller);
        try {
          window.localStorage.setItem(RESELLER_TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }
    } catch {
      setAuthError('Unable to reach server. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!q) return true;
      return `${p.name} ${p.categoryLabel} ${p.origin}`.toLowerCase().includes(q);
    });
  }, [products, searchQuery]);

  const activeOrderProduct =
    products.find((p) => p.id === selectedProductId) ?? products[0] ?? null;

  const wholesalePrice = activeOrderProduct
    ? activeOrderProduct.resellerPriceBdt ?? Math.round(activeOrderProduct.priceBdt * 0.85)
    : 0;
  const sellingPriceNum = Math.round(Number(sellingPriceInput) || 0);
  const unitProfit = Math.max(0, sellingPriceNum - wholesalePrice);
  const totalEstimatedProfit = unitProfit * orderQty;
  const orderSubtotal = sellingPriceNum * orderQty;
  const orderZone = inferZoneFromDistrict(custDivision, custDistrict);
  const orderDeliveryFee = calculateDeliveryFee(orderSubtotal, orderZone);
  const orderGrandTotal = orderSubtotal + orderDeliveryFee;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setErrorMsg('Could not copy automatically. Please copy manually.');
    }
  };

  const openOrderForProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || 'standard');
    setOrderQty(1);
    setSellingPriceInput(String(product.priceBdt));
    setOrderSuccessCode('');
    setErrorMsg('');
    setActiveTab('order');
  };

  const handleSubmitResellerOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeOrderProduct) return;
    setErrorMsg('');
    setOrderSuccessCode('');

    if (!custName.trim() || !isValidBdPhone(custPhone) || !custAddress.trim()) {
      setErrorMsg('Please enter customer full name, valid 11-digit BD mobile number, and full address.');
      return;
    }
    if (sellingPriceNum < wholesalePrice) {
      setErrorMsg(`Customer selling price must be at least ৳${wholesalePrice} (wholesale price).`);
      return;
    }
    if (
      (custPayment === 'bkash' || custPayment === 'nagad' || custPayment === 'rocket') &&
      custTrxId.trim().length < 5
    ) {
      setErrorMsg('Please enter the customer advance Transaction ID (TrxID).');
      return;
    }

    setPlacingOrder(true);
    try {
      const selectedVar =
        activeOrderProduct.variants.find((v) => v.id === selectedVariantId) ??
        activeOrderProduct.variants[0];
      const res = await fetch('/api/reseller/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer: {
            fullName: custName.trim(),
            phone: custPhone.trim(),
            division: custDivision,
            district: custDistrict,
            areaAddress: custAddress.trim(),
            zone: orderZone,
          },
          payment: {
            method: custPayment,
            trxId: custTrxId.trim() || undefined,
          },
          items: [
            {
              productId: activeOrderProduct.id,
              variantId: selectedVar?.id || 'standard',
              variantLabel: selectedVar?.label || 'Standard',
              quantity: orderQty,
              sellingPriceBdt: sellingPriceNum,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not place reseller order.');
      } else {
        setOrderSuccessCode(data.order.orderCode);
        setCustName('');
        setCustPhone('');
        setCustAddress('');
        setCustTrxId('');
        fetchDashboard();
      }
    } catch {
      setErrorMsg('Network error submitting reseller order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorMsg('');
    setPayoutSuccessMsg('');
    setRequestingPayout(true);
    try {
      const res = await fetch('/api/reseller/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amountBdt: Number(withdrawAmount),
          method: withdrawMethod,
          accountNumber: withdrawAccount.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit withdrawal request.');
      } else {
        setWithdrawAmount('');
        setPayoutSuccessMsg(
          `Withdrawal request ${data.payout.id} for ${formatBDT(data.payout.amountBdt)} submitted.`,
        );
        fetchDashboard();
      }
    } catch {
      setErrorMsg('Network error requesting withdrawal.');
    } finally {
      setRequestingPayout(false);
    }
  };

  // --- Unauthenticated Reseller Gate ---
  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#141413] flex flex-col justify-between px-4 py-8">
        <div className="max-w-5xl w-full mx-auto">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5C5B57] hover:text-[#141413] py-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to {siteSettings.storeName} Storefront</span>
          </button>
        </div>

        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-8">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F523E]">
              {siteSettings.storeName} Reseller Channel
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#141413] leading-tight">
              Start reselling across Bangladesh with zero stock investment.
            </h1>
            <p className="text-sm text-[#5C5B57] leading-relaxed">
              Share products on Facebook, WhatsApp, or TikTok at your own selling price. We pack and deliver directly to your customer across all 64 districts and send your profit via bKash, Nagad, or Rocket.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#141413]/10 text-xs">
              <div>
                <p className="font-semibold text-[#141413]">Wholesale Reseller Pricing</p>
                <p className="text-[#5C5B57] mt-0.5">Save 15%+ below retail and keep full margin.</p>
              </div>
              <div>
                <p className="font-semibold text-[#141413]">Direct 64-District Delivery</p>
                <p className="text-[#5C5B57] mt-0.5">Cash on Delivery, bKash, Nagad &amp; Rocket supported.</p>
              </div>
              <div>
                <p className="font-semibold text-[#141413]">Custom Referral Links</p>
                <p className="text-[#5C5B57] mt-0.5">Earn automatic commission from shared links.</p>
              </div>
              <div>
                <p className="font-semibold text-[#141413]">Fast MFS Withdrawals</p>
                <p className="text-[#5C5B57] mt-0.5">Withdraw profit anytime from ৳200.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-[#141413]/12 rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="grid grid-cols-2 p-1 bg-[#F2F1ED] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  authMode === 'login' ? 'bg-white text-[#141413] shadow-2xs' : 'text-[#5C5B57]'
                }`}
              >
                Reseller Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  authMode === 'register' ? 'bg-white text-[#141413] shadow-2xs' : 'text-[#5C5B57]'
                }`}
              >
                Join as Reseller
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5B57] mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Arifur Rahman"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5B57] mb-1">
                      Page / Shop Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regShopName}
                      onChange={(e) => setRegShopName(e.target.value)}
                      placeholder="e.g. Dhaka Gadget Mart"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-[#5C5B57] mb-1">
                  Mobile Number (+880)
                </label>
                <input
                  type="tel"
                  required
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm font-mono-tabular"
                />
              </div>

              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#5C5B57] mb-1">
                      Payout Wallet
                    </label>
                    <select
                      value={regPayoutMethod}
                      onChange={(e) =>
                        setRegPayoutMethod(e.target.value as 'bkash' | 'nagad' | 'rocket')
                      }
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm"
                    >
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5B57] mb-1">
                      Payout Number
                    </label>
                    <input
                      type="tel"
                      value={regPayoutNumber}
                      onChange={(e) => setRegPayoutNumber(e.target.value)}
                      placeholder="Same as mobile"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm font-mono-tabular"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#5C5B57] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showAuthPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-10 pl-3 pr-10 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword((s) => !s)}
                    aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5C5B57]"
                  >
                    {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 bg-[#0F523E] hover:bg-[#0B3F30] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Open Reseller Dashboard'
                    : 'Create Free Reseller Account'}
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-5xl w-full mx-auto text-center text-xs text-[#5C5B57]">
          {siteSettings.storeName} Reseller Partner Channel · Nationwide Fulfillment
        </div>
      </div>
    );
  }

  // --- Authenticated Reseller Hub Workspace ---
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141413]">
      <header className="bg-white border-b border-[#141413]/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Store className="w-5 h-5 text-[#0F523E] shrink-0" aria-hidden="true" />
            <div className="truncate">
              <p className="text-sm font-semibold text-[#141413] truncate">
                {reseller?.shopName || 'Reseller Hub'}
              </p>
              <p className="text-[11px] text-[#5C5B57] font-mono-tabular">
                Code: {reseller?.code || '...'} · {reseller?.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#F2F1ED] hover:bg-[#E7E5DE] rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#F2F1ED] hover:bg-[#E7E5DE] rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {errorMsg && (
          <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="underline">
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#141413]/10 p-4">
            <p className="text-xs text-[#5C5B57]">Total Orders</p>
            <p className="text-2xl font-semibold tabular-nums text-[#141413] mt-1">
              {stats.totalOrders}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#141413]/10 p-4">
            <p className="text-xs text-[#5C5B57]">Delivered Profit</p>
            <p className="text-2xl font-semibold tabular-nums text-[#0F523E] mt-1">
              {formatBDT(stats.deliveredProfitBdt)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#141413]/10 p-4">
            <p className="text-xs text-[#5C5B57]">Pending (In Transit)</p>
            <p className="text-2xl font-semibold tabular-nums text-[#141413] mt-1">
              {formatBDT(stats.pendingProfitBdt)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#141413]/10 p-4">
            <p className="text-xs text-[#5C5B57]">Available Balance</p>
            <p className="text-2xl font-semibold tabular-nums text-[#0F523E] mt-1">
              {formatBDT(stats.availableBalanceBdt)}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F1ED] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'catalog' ? 'bg-white text-[#141413] shadow-2xs' : 'text-[#5C5B57]'
            }`}
          >
            <Package className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Products &amp; Wholesale Prices</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'order' ? 'bg-white text-[#141413] shadow-2xs' : 'text-[#5C5B57]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Submit Customer Order</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'earnings' ? 'bg-white text-[#141413] shadow-2xs' : 'text-[#5C5B57]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>My Orders &amp; Withdraw ({orders.length})</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS & WHOLESALE PRICING */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-[#5C5B57] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reseller products..."
                  className="w-full h-10 pl-9 pr-3 bg-white border border-[#141413]/15 rounded-lg text-xs"
                />
              </div>
              {reseller && (
                <div className="flex items-center gap-2 text-xs text-[#5C5B57]">
                  <span>Store Referral Link:</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        'store-ref',
                        `${window.location.origin}/?reseller=${reseller.code}`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#141413]/15 rounded-lg font-mono-tabular text-[#141413] hover:border-[#0F523E]"
                  >
                    <span>?reseller={reseller.code}</span>
                    {copiedKey === 'store-ref' ? (
                      <Check className="w-3.5 h-3.5 text-[#0F523E]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const wPrice = p.resellerPriceBdt ?? Math.round(p.priceBdt * 0.85);
                const estMargin = Math.max(0, p.priceBdt - wPrice);
                const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?product=${p.slug}&reseller=${reseller?.code || ''}`;
                const fbCaption = `${p.name}\nPrice: ${formatBDT(p.priceBdt)}\n${p.shortDesc}\nOrder direct: ${shareUrl}`;
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-[#141413]/10 p-4 flex flex-col justify-between gap-4"
                  >
                    <div className="flex gap-3.5">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#FAFAF8] border border-[#141413]/10 shrink-0">
                        <ResilientImage
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] text-[#5C5B57]">
                          {p.categoryLabel} · Stock: {p.stock}
                        </p>
                        <h3 className="text-sm font-semibold text-[#141413] leading-snug line-clamp-2">
                          {p.name}
                        </h3>
                        <div className="pt-1 space-y-0.5 text-xs tabular-nums">
                          <p className="text-[#5C5B57]">
                            Wholesale:{' '}
                            <span className="font-semibold text-[#141413]">
                              {formatBDT(wPrice)}
                            </span>
                          </p>
                          <p className="text-[#5C5B57]">
                            Suggested Retail: {formatBDT(p.priceBdt)} ·{' '}
                            <span className="font-semibold text-[#0F523E]">
                              +{formatBDT(estMargin)} profit
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#141413]/10">
                      <button
                        type="button"
                        onClick={() => copyText(`link-${p.id}`, shareUrl)}
                        className="h-9 px-2 rounded-lg bg-[#FAFAF8] border border-[#141413]/15 hover:border-[#0F523E] text-[11px] font-medium text-[#141413] inline-flex items-center justify-center gap-1"
                      >
                        {copiedKey === `link-${p.id}` ? (
                          <Check className="w-3.5 h-3.5 text-[#0F523E]" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === `link-${p.id}` ? 'Copied' : 'Link'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(`post-${p.id}`, fbCaption)}
                        className="h-9 px-2 rounded-lg bg-[#FAFAF8] border border-[#141413]/15 hover:border-[#0F523E] text-[11px] font-medium text-[#141413] inline-flex items-center justify-center gap-1"
                      >
                        {copiedKey === `post-${p.id}` ? (
                          <Check className="w-3.5 h-3.5 text-[#0F523E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === `post-${p.id}` ? 'Copied' : 'Post Text'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={p.stock <= 0}
                        onClick={() => openOrderForProduct(p)}
                        className="h-9 px-2 rounded-lg bg-[#0F523E] hover:bg-[#0B3F30] disabled:opacity-45 text-white text-[11px] font-semibold"
                      >
                        Place Order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SUBMIT CUSTOMER DROPSHIP ORDER */}
        {activeTab === 'order' && activeOrderProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSubmitResellerOrder}
              className="lg:col-span-7 bg-white rounded-xl border border-[#141413]/10 p-6 space-y-5"
            >
              <div>
                <h2 className="text-base font-semibold text-[#141413]">
                  Submit Customer Dropship Order
                </h2>
                <p className="text-xs text-[#5C5B57] mt-0.5">
                  Set your own customer price above the wholesale rate. We deliver directly under {siteSettings.storeName} courier and credit your profit automatically.
                </p>
              </div>

              {orderSuccessCode && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#0F523E] font-medium">
                  Order #{orderSuccessCode} confirmed! Track status and profit inside &ldquo;My Orders &amp; Withdraw&rdquo;.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Select Product</label>
                  <select
                    value={activeOrderProduct.id}
                    onChange={(e) => {
                      const next = products.find((p) => p.id === e.target.value);
                      if (next) {
                        setSelectedProductId(next.id);
                        setSelectedVariantId(next.variants[0]?.id || 'standard');
                        setSellingPriceInput(String(next.priceBdt));
                      }
                    }}
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Wholesale {formatBDT(p.resellerPriceBdt ?? Math.round(p.priceBdt * 0.85))})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Variant</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    {activeOrderProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Wholesale Rate</label>
                  <input
                    type="text"
                    readOnly
                    value={formatBDT(wholesalePrice)}
                    className="w-full h-10 px-3 bg-[#F2F1ED] border border-[#141413]/10 rounded-lg text-xs font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">
                    Your Selling Price (৳)
                  </label>
                  <input
                    type="number"
                    min={wholesalePrice}
                    required
                    value={sellingPriceInput}
                    onChange={(e) => setSellingPriceInput(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, activeOrderProduct.stock)}
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#141413]/10 space-y-3">
                <p className="text-xs font-semibold text-[#141413]">Customer Delivery Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Customer Full Name"
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  />
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="Customer Mobile (017XXXXXXXX)"
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={custDivision}
                    onChange={(e) => {
                      const nextDiv = e.target.value;
                      setCustDivision(nextDiv);
                      const found = BANGLADESH_DIVISIONS.find((d) => d.division === nextDiv);
                      if (found?.districts[0]) setCustDistrict(found.districts[0]);
                    }}
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    {BANGLADESH_DIVISIONS.map((d) => (
                      <option key={d.division} value={d.division}>
                        {d.division}
                      </option>
                    ))}
                  </select>
                  <select
                    value={custDistrict}
                    onChange={(e) => setCustDistrict(e.target.value)}
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    {(BANGLADESH_DIVISIONS.find((d) => d.division === custDivision)?.districts ?? []).map(
                      (dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <input
                  type="text"
                  required
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="House, Road, Thana & Full Address"
                  className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">
                    Customer Payment Mode
                  </label>
                  <select
                    value={custPayment}
                    onChange={(e) => setCustPayment(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    <option value="cod">Cash on Delivery (COD)</option>
                    <option value="bkash">bKash Advance Paid</option>
                    <option value="nagad">Nagad Advance Paid</option>
                    <option value="rocket">Rocket Advance Paid</option>
                    <option value="card">Mastercard / Visa Paid</option>
                  </select>
                </div>
                {(custPayment === 'bkash' || custPayment === 'nagad' || custPayment === 'rocket') && (
                  <div>
                    <label className="block text-xs text-[#5C5B57] mb-1">
                      Transaction ID (TrxID)
                    </label>
                    <input
                      type="text"
                      required
                      value={custTrxId}
                      onChange={(e) => setCustTrxId(e.target.value)}
                      placeholder="Enter TrxID"
                      className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular uppercase"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={placingOrder}
                className="w-full h-11 bg-[#0F523E] hover:bg-[#0B3F30] disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
              >
                {placingOrder ? 'Submitting Order...' : 'Confirm Customer Order'}
              </button>
            </form>

            <div className="lg:col-span-5 bg-white rounded-xl border border-[#141413]/10 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#141413]">Profit &amp; Invoice Breakdown</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#5C5B57]">
                  <span>Wholesale Cost ({orderQty}×)</span>
                  <span className="tabular-nums">{formatBDT(wholesalePrice * orderQty)}</span>
                </div>
                <div className="flex justify-between text-[#5C5B57]">
                  <span>Customer Product Total</span>
                  <span className="tabular-nums">{formatBDT(orderSubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#5C5B57]">
                  <span>Delivery ({DELIVERY_ZONES[orderZone].label})</span>
                  <span className="tabular-nums">
                    {orderDeliveryFee === 0 ? 'Free' : formatBDT(orderDeliveryFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#141413]/10 flex justify-between font-semibold text-sm text-[#141413]">
                  <span>Customer Pays Total</span>
                  <span className="tabular-nums">{formatBDT(orderGrandTotal)}</span>
                </div>
                <div className="pt-2 border-t border-[#141413]/10 flex justify-between font-semibold text-base text-[#0F523E]">
                  <span>Your Reseller Profit</span>
                  <span className="tabular-nums">+{formatBDT(totalEstimatedProfit)}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#5C5B57] leading-relaxed">
                Profit moves from Pending to Available Balance automatically as soon as the store marks the parcel Delivered.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: MY ORDERS & PAYOUT WITHDRAWALS */}
        {activeTab === 'earnings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white rounded-xl border border-[#141413]/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#141413]/10">
                <h2 className="text-sm font-semibold text-[#141413]">Reseller Orders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#141413]/10 text-[#5C5B57] bg-[#FAFAF8]">
                      <th className="py-3 px-4 font-medium">Order</th>
                      <th className="py-3 px-4 font-medium">Customer</th>
                      <th className="py-3 px-4 font-medium">Total</th>
                      <th className="py-3 px-4 font-medium">Your Profit</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141413]/10">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#5C5B57]">
                          No reseller orders yet. Share a link or submit your first customer order!
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.orderCode}>
                          <td className="py-3 px-4 font-mono-tabular font-semibold">
                            #{o.orderCode}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-[#141413]">{o.customer.fullName}</p>
                            <p className="text-[11px] text-[#5C5B57]">{o.customer.district}</p>
                          </td>
                          <td className="py-3 px-4 tabular-nums font-medium">
                            {formatBDT(o.pricing.totalBdt)}
                          </td>
                          <td className="py-3 px-4 tabular-nums font-semibold text-[#0F523E]">
                            +{formatBDT(o.reseller?.profitBdt ?? 0)}
                          </td>
                          <td className="py-3 px-4 text-[#5C5B57] capitalize">
                            {o.status.replace('_', ' ')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <form
                onSubmit={handleRequestPayout}
                className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#141413]">Withdraw Profit</h3>
                  <span className="text-xs font-semibold tabular-nums text-[#0F523E]">
                    {formatBDT(stats.availableBalanceBdt)} available
                  </span>
                </div>

                {payoutSuccessMsg && (
                  <p className="text-xs text-[#0F523E] bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    {payoutSuccessMsg}
                  </p>
                )}

                <div>
                  <label className="block text-xs text-[#5C5B57] mb-1">Amount (Min ৳200)</label>
                  <input
                    type="number"
                    min={200}
                    max={Math.max(200, stats.availableBalanceBdt)}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs tabular-nums"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={withdrawMethod}
                    onChange={(e) =>
                      setWithdrawMethod(e.target.value as 'bkash' | 'nagad' | 'rocket')
                    }
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder="Wallet number"
                    className="h-10 px-3 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-xs font-mono-tabular"
                  />
                </div>
                <button
                  type="submit"
                  disabled={requestingPayout || stats.availableBalanceBdt < 200}
                  className="w-full h-10 bg-[#0F523E] hover:bg-[#0B3F30] disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                >
                  {requestingPayout ? 'Requesting...' : 'Request Payout'}
                </button>
              </form>

              <div className="bg-white rounded-xl border border-[#141413]/10 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#141413]">Withdrawal History</h3>
                {payouts.length === 0 ? (
                  <p className="text-xs text-[#5C5B57]">No payout requests yet.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {payouts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between pt-2 first:pt-0 border-t first:border-t-0 border-[#141413]/10"
                      >
                        <div>
                          <p className="font-semibold text-[#141413] tabular-nums">
                            {formatBDT(p.amountBdt)} · {p.method.toUpperCase()}
                          </p>
                          <p className="text-[11px] text-[#5C5B57] font-mono-tabular">
                            {p.accountNumber} · {p.requestedAt}
                          </p>
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            p.status === 'paid' ? 'text-[#0F523E]' : 'text-amber-700'
                          }`}
                        >
                          {p.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
