export type CategoryId =
  | 'all'
  | 'mobiles'
  | 'laptops'
  | 'accessories'
  | 'fashion'
  | 'home-living'
  | 'beauty'
  | 'sports'
  | 'gifts';

export type BangladeshZone = 'dhaka-metro' | 'sub-dhaka' | 'nationwide';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'rocket' | 'card';

export type OrderStatus =
  | 'confirmed'
  | 'packed'
  | 'in_transit'
  | 'delivered';

export interface ProductVariant {
  id: string;
  label: string;
  colorHex?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Exclude<CategoryId, 'all'>;
  categoryLabel: string;
  origin: string;
  priceBdt: number;
  compareAtBdt?: number;
  discountPercent?: number;
  stock: number;
  availabilityNote: 'In Stock' | 'Limited Run';
  rating: number;
  reviewCount: number;
  image: string;
  imageKey?: string;
  shortDesc: string;
  story: string;
  specs: Array<{ label: string; value: string }>;
  variants: ProductVariant[];
  reviews: ProductReview[];
  sourcePlatform?: string;
  externalUrl?: string;
  actionMode?: 'direct' | 'external' | 'both';
  adBadge?: string;
  resellerPriceBdt?: number;
}

export interface AdSettings {
  metaPixelId: string;
  googleTagId: string;
  tiktokPixelId: string;
  defaultUtmSource: string;
}

export interface SiteSettings {
  storeName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  topBarText1: string;
  topBarText2: string;
  topBarText3: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubtitle: string;
  heroBadgeTop: string;
  heroBadgeMain: string;
  heroBannerUrl: string;
  specialOfferBadge: string;
  specialOfferTitle: string;
  specialOfferSubtitle: string;
  specialOfferPromoCode: string;
  whyChooseTitle: string;
  whyChooseItems: string[];
  whyChooseFooter: string;
  whatsappNumber: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  addressText: string;
  footerDescription: string;
  copyrightText: string;
  showPromoBanner: boolean;
  showNewsletter: boolean;
  showWhyChoose: boolean;
}

export interface PromoCodeRule {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minSubtotal: number;
  label: string;
}

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

export interface AdminOverviewStats {
  totalRevenueBdt: number;
  totalOrders: number;
  pendingFulfillment: number;
  lowStockCount: number;
  subscriberCount: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  name: string;
  priceBdt: number;
  image: string;
  categoryLabel: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  name: string;
  priceBdt: number;
  quantity: number;
}

export interface Order {
  orderCode: string;
  createdAt: string;
  status: OrderStatus;
  estimatedDelivery: string;
  customer: {
    fullName: string;
    phone: string;
    division: string;
    district: string;
    areaAddress: string;
    zone: BangladeshZone;
  };
  payment: {
    method: PaymentMethod;
    trxId?: string;
    statusLabel: string;
  };
  items: OrderItem[];
  pricing: {
    subtotalBdt: number;
    discountBdt: number;
    promoCode?: string;
    deliveryFeeBdt: number;
    totalBdt: number;
  };
  timeline: Array<{
    stage: OrderStatus;
    label: string;
    detail: string;
    timestamp?: string;
    completed: boolean;
  }>;
  reseller?: {
    resellerId: string;
    resellerCode: string;
    shopName: string;
    profitBdt: number;
  };
}

export interface ResellerAccount {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  shopName: string;
  payoutMethod: 'bkash' | 'nagad' | 'rocket';
  payoutNumber: string;
  status: 'active' | 'suspended';
  withdrawnBdt: number;
  createdAt: string;
}

export interface ResellerPayoutRequest {
  id: string;
  resellerId: string;
  resellerCode: string;
  shopName: string;
  amountBdt: number;
  method: 'bkash' | 'nagad' | 'rocket';
  accountNumber: string;
  status: 'pending' | 'paid';
  requestedAt: string;
  paidAt?: string;
}

export interface ResellerDashboardStats {
  totalOrders: number;
  deliveredProfitBdt: number;
  pendingProfitBdt: number;
  availableBalanceBdt: number;
  withdrawnBdt: number;
}
