import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type {
  AdSettings,
  AdminOverviewStats,
  BangladeshZone,
  NewsletterSubscriber,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductReview,
  PromoCodeRule,
  ResellerAccount,
  ResellerDashboardStats,
  ResellerPayoutRequest,
  SiteSettings,
} from './src/types/store.ts';

const PORT = 3000;
const DB_STORE_PATH = '/tmp/bdhridoyshop-db-v2.json';
const FREE_DELIVERY_THRESHOLD_BDT = 5000;

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin@bdhridoyshop.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bdhridoy2026';
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update(`bdhridoy-${ADMIN_PASSWORD}`).digest('hex');

const ZONE_FEES: Record<BangladeshZone, { fee: number; eta: string }> = {
  'dhaka-metro': { fee: 60, eta: '24 Hours (Next-Day Express)' },
  'sub-dhaka': { fee: 90, eta: '24–48 Hours' },
  nationwide: { fee: 120, eta: '48–72 Hours via Express Courier' },
};

function buildTimeline(status: OrderStatus, createdAtLabel: string, district: string) {
  const orderStages: Array<{ stage: OrderStatus; label: string; detail: string }> = [
    {
      stage: 'confirmed',
      label: 'Order Confirmed',
      detail: 'Verified at BdHridoyShop Dhaka Desk',
    },
    {
      stage: 'packed',
      label: 'Packed in Dhaka',
      detail: 'Quality checked & sealed in protective parcel box',
    },
    {
      stage: 'in_transit',
      label: 'Out for Courier',
      detail: `Dispatched toward ${district} hub`,
    },
    {
      stage: 'delivered',
      label: 'Delivered',
      detail: 'Handed over to recipient',
    },
  ];

  const rankMap: Record<OrderStatus, number> = {
    confirmed: 0,
    packed: 1,
    in_transit: 2,
    delivered: 3,
  };
  const currentRank = rankMap[status];

  return orderStages.map((s, idx) => ({
    stage: s.stage,
    label: s.label,
    detail: s.detail,
    timestamp: idx <= currentRank ? createdAtLabel : undefined,
    completed: idx <= currentRank,
  }));
}

const SEED_PRODUCTS: Product[] = [
  {
    id: 'wireless-earbuds-tws',
    slug: 'wireless-earbuds-tws',
    name: 'Wireless Earbuds TWS',
    category: 'accessories',
    categoryLabel: 'Accessories',
    origin: 'BdHridoy Verified',
    priceBdt: 1999,
    compareAtBdt: 2499,
    discountPercent: 20,
    stock: 28,
    availabilityNote: 'In Stock',
    rating: 4.9,
    reviewCount: 1,
    image: '',
    imageKey: 'headphones',
    shortDesc: 'Crystal-clear Bluetooth 5.3 audio with active call noise reduction and 32h battery.',
    story:
      'Engineered for daily Dhaka commutes and clear voice calls. Features touch playback controls, IPX5 sweat resistance, and rapid USB-C charging.',
    specs: [
      { label: 'Connectivity', value: 'Bluetooth 5.3 Low-Latency' },
      { label: 'Battery', value: '32 Hours Total with Case' },
      { label: 'Charging', value: 'USB-C Fast Charge' },
      { label: 'Warranty', value: '6 Months Official Replacement' },
    ],
    variants: [
      { id: 'matte-black', label: 'Matte Black', colorHex: '#1E293B' },
      { id: 'pearl-white', label: 'Pearl White', colorHex: '#F1F5F9' },
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Tanvir Ahmed',
        city: 'Banani, Dhaka',
        rating: 5,
        date: '12 Nov 2026',
        comment: 'Great bass and call clarity for the price. Received next day in Dhaka.',
      },
    ],
  },
  {
    id: 'smart-watch-pro',
    slug: 'smart-watch-pro',
    name: 'Smart Watch',
    category: 'accessories',
    categoryLabel: 'Accessories',
    origin: 'BdHridoy Verified',
    priceBdt: 2999,
    compareAtBdt: 3999,
    discountPercent: 25,
    stock: 19,
    availabilityNote: 'In Stock',
    rating: 4.8,
    reviewCount: 1,
    image: '',
    imageKey: 'watch',
    shortDesc: 'AMOLED display smartwatch with Bluetooth calling, heart-rate monitor & 10-day battery.',
    story:
      'Stay connected with crisp Bangla & English notifications, SpO2 tracking, 100+ workout modes, and interchangeable 20mm straps.',
    specs: [
      { label: 'Display', value: '1.43" Always-On AMOLED' },
      { label: 'Battery', value: 'Up to 10 Days' },
      { label: 'Water Resistance', value: 'IP68 Waterproof' },
      { label: 'Compatibility', value: 'Android & iOS' },
    ],
    variants: [
      { id: 'emerald-tan', label: 'Silver · Tan Strap', colorHex: '#0F523E' },
      { id: 'obsidian-black', label: 'Graphite · Black Strap', colorHex: '#1E293B' },
    ],
    reviews: [
      {
        id: 'rev-2',
        author: 'Nafis Chowdhury',
        city: 'Chattogram',
        rating: 5,
        date: '10 Nov 2026',
        comment: 'Display is super bright outdoors and battery easily lasts a full week.',
      },
    ],
  },
  {
    id: 'laptop-backpack-urban',
    slug: 'laptop-backpack-urban',
    name: 'Laptop Backpack',
    category: 'laptops',
    categoryLabel: 'Laptops & Carry',
    origin: 'Dhaka Gear Studio',
    priceBdt: 1699,
    compareAtBdt: 1999,
    discountPercent: 15,
    stock: 24,
    availabilityNote: 'In Stock',
    rating: 4.9,
    reviewCount: 1,
    image: '',
    imageKey: 'satchel',
    shortDesc: 'Water-resistant 15.6" laptop carry bag with padded tech compartment & USB port.',
    story:
      'Designed for students and professionals across Bangladesh. Built with monsoon-ready water-repellent fabric, anti-theft back pocket, and ergonomic airflow straps.',
    specs: [
      { label: 'Laptop Fit', value: 'Up to 15.6-inch Laptop' },
      { label: 'Material', value: 'Water-Resistant Oxford & Leather Trim' },
      { label: 'Capacity', value: '24 Liters' },
      { label: 'Warranty', value: '1 Year Zipper & Stitch Warranty' },
    ],
    variants: [
      { id: 'espresso-brown', label: 'Classic Espresso', colorHex: '#3B2820' },
      { id: 'crimson-slate', label: 'Urban Charcoal', colorHex: '#334155' },
    ],
    reviews: [
      {
        id: 'rev-3',
        author: 'Farhan Kabir',
        city: 'Dhanmondi, Dhaka',
        rating: 5,
        date: '08 Nov 2026',
        comment: 'Fits my 15-inch laptop and charger neatly without feeling bulky.',
      },
    ],
  },
  {
    id: 'sports-shoes-runner',
    slug: 'sports-shoes-runner',
    name: 'Sports Shoes',
    category: 'sports',
    categoryLabel: 'Sports',
    origin: 'Active Performance',
    priceBdt: 2499,
    compareAtBdt: 3599,
    discountPercent: 30,
    stock: 16,
    availabilityNote: 'Limited Run',
    rating: 4.8,
    reviewCount: 1,
    image: '',
    imageKey: 'kantha',
    shortDesc: 'Lightweight breathable mesh running sneakers with high-rebound cushioned sole.',
    story:
      'Engineered for morning runs at Hatirjheel or daily gym sessions. Breathable knit upper keeps feet cool in humid conditions with non-slip rubber traction.',
    specs: [
      { label: 'Upper', value: 'Breathable Engineered Knit Mesh' },
      { label: 'Midsole', value: 'High-Rebound EVA Cushion' },
      { label: 'Outsole', value: 'Anti-Slip Traction Rubber' },
      { label: 'Weight', value: '245g per shoe' },
    ],
    variants: [
      { id: 'blue-41', label: 'Cobalt Blue · EU 41', colorHex: '#2563EB' },
      { id: 'blue-42', label: 'Cobalt Blue · EU 42', colorHex: '#2563EB' },
      { id: 'blue-43', label: 'Cobalt Blue · EU 43', colorHex: '#2563EB' },
    ],
    reviews: [
      {
        id: 'rev-4',
        author: 'Mahir Rahman',
        city: 'Uttara, Dhaka',
        rating: 5,
        date: '05 Nov 2026',
        comment: 'Very comfortable cushioning and true to EU size.',
      },
    ],
  },
  {
    id: 'mechanical-keyboard-75',
    slug: 'mechanical-keyboard-75',
    name: 'Wireless Mechanical Keyboard 75%',
    category: 'laptops',
    categoryLabel: 'Laptops & Desk',
    origin: 'Tech Atelier',
    priceBdt: 4850,
    compareAtBdt: 6200,
    discountPercent: 22,
    stock: 11,
    availabilityNote: 'In Stock',
    rating: 4.9,
    reviewCount: 0,
    image: '',
    imageKey: 'keyboard',
    shortDesc: 'Tri-mode 2.4GHz / Bluetooth / USB-C hot-swappable mechanical keyboard with knob.',
    story:
      'Ideal for developers, gamers, and remote professionals. Gasket-mounted acoustics with long-lasting PBT keycaps and 4000mAh battery.',
    specs: [
      { label: 'Connectivity', value: '2.4GHz / Bluetooth 5.1 / USB-C' },
      { label: 'Switches', value: 'Hot-Swappable Tactile' },
      { label: 'Battery', value: '4000mAh Rechargeable' },
      { label: 'Layout', value: '75% Compact with Volume Dial' },
    ],
    variants: [{ id: 'emerald-chalk', label: 'Emerald & Chalk', colorHex: '#0F523E' }],
    reviews: [],
  },
  {
    id: 'sonargaon-jamdani-panjabi',
    slug: 'sonargaon-jamdani-panjabi',
    name: 'Sonargaon Jamdani Cotton Panjabi',
    category: 'fashion',
    categoryLabel: 'Fashion',
    origin: 'Narayanganj Loom',
    priceBdt: 2890,
    compareAtBdt: 3600,
    discountPercent: 20,
    stock: 14,
    availabilityNote: 'Limited Run',
    rating: 4.9,
    reviewCount: 0,
    image: '',
    imageKey: 'jamdani',
    shortDesc: 'Breathable 80-count Bangladeshi handloom cotton Panjabi with woven Jamdani motifs.',
    story:
      'Woven in Narayanganj for year-round Bangladeshi comfort and festive occasions. Crisp mandarin collar and tailored contemporary fit.',
    specs: [
      { label: 'Fabric', value: '100% 80-Count Combed Cotton' },
      { label: 'Origin', value: 'Rupganj, Narayanganj' },
      { label: 'Fit', value: 'Regular Contemporary' },
    ],
    variants: [
      { id: 'emerald-m', label: 'Forest Emerald · M', colorHex: '#0F523E' },
      { id: 'emerald-l', label: 'Forest Emerald · L', colorHex: '#0F523E' },
      { id: 'emerald-xl', label: 'Forest Emerald · XL', colorHex: '#0F523E' },
    ],
    reviews: [],
  },
  {
    id: 'barind-desk-lamp',
    slug: 'barind-desk-lamp',
    name: 'Articulated Study & Desk Lamp',
    category: 'home-living',
    categoryLabel: 'Home & Living',
    origin: 'Dhaka Living',
    priceBdt: 2250,
    compareAtBdt: 4500,
    discountPercent: 50,
    stock: 12,
    availabilityNote: 'In Stock',
    rating: 4.9,
    reviewCount: 0,
    image: '',
    imageKey: 'lamp',
    shortDesc: 'Weighted brushed brass and matte black study lamp with warm eye-care LED bulb.',
    story:
      'Built for Bangladesh 220V–240V outlets with weighted non-tip base and flicker-free 2700K illumination.',
    specs: [
      { label: 'Voltage', value: '220V–240V BD Standard' },
      { label: 'Bulb', value: 'Warm Eye-Care LED Included' },
      { label: 'Height', value: '48 cm Adjustable' },
    ],
    variants: [{ id: 'matte-brass', label: 'Matte Black & Brass', colorHex: '#B4843E' }],
    reviews: [],
  },
  {
    id: 'srimangal-tea-gift-set',
    slug: 'srimangal-tea-gift-set',
    name: 'Ceramic Tea Pot & Cup Gift Set',
    category: 'gifts',
    categoryLabel: 'Gifts',
    origin: 'Rayerbazar Studio',
    priceBdt: 1850,
    compareAtBdt: 3700,
    discountPercent: 50,
    stock: 20,
    availabilityNote: 'In Stock',
    rating: 4.8,
    reviewCount: 0,
    image: '',
    imageKey: 'teaset',
    shortDesc: 'Gift-boxed matte stoneware teapot with two tasting cups and stainless infuser.',
    story:
      'Thoughtful housewarming or corporate gift set packed in a double-cushioned gift box ready for courier delivery anywhere in Bangladesh.',
    specs: [
      { label: 'Set Includes', value: '650ml Teapot + 2 Cups' },
      { label: 'Material', value: 'High-Fired Stoneware' },
    ],
    variants: [{ id: 'charcoal-clay', label: 'Matte Charcoal & Clay', colorHex: '#2C2C2A' }],
    reviews: [],
  },
  {
    id: 'smartphone-fast-power-bundle',
    slug: 'smartphone-fast-power-bundle',
    name: '20W GaN Charger & MagSafe Case Kit',
    category: 'mobiles',
    categoryLabel: 'Mobiles',
    origin: 'Mobile Essentials',
    priceBdt: 1450,
    compareAtBdt: 2900,
    discountPercent: 50,
    stock: 30,
    availabilityNote: 'In Stock',
    rating: 4.8,
    reviewCount: 0,
    image: '',
    imageKey: 'headphones',
    shortDesc: '3-pin BD plug GaN fast charger with braided USB-C cable and shockproof phone kit.',
    story:
      'Surge-protected fast charging tailored for Bangladeshi voltage fluctuations, compatible with iPhone, Samsung, Xiaomi, and Pixel devices.',
    specs: [
      { label: 'Output', value: '20W–30W PD Fast Charge' },
      { label: 'Plug Type', value: 'BD 3-Pin Standard' },
    ],
    variants: [{ id: 'usb-c-kit', label: 'USB-C PD Kit', colorHex: '#1E293B' }],
    reviews: [],
  },
  {
    id: 'botanical-skincare-duo',
    slug: 'botanical-skincare-duo',
    name: 'Hydrating Neem & Vitamin C Care Set',
    category: 'beauty',
    categoryLabel: 'Beauty & Care',
    origin: 'Pure Care BD',
    priceBdt: 1290,
    compareAtBdt: 1850,
    discountPercent: 30,
    stock: 4,
    availabilityNote: 'In Stock',
    rating: 4.9,
    reviewCount: 0,
    image: '',
    imageKey: 'teaset',
    shortDesc: 'Dermatologically tested daily cleanser and lightweight hydrating gel for humid weather.',
    story:
      'Formulated for tropical humidity with non-comedogenic botanical extracts that keep skin fresh without oiliness.',
    specs: [
      { label: 'Volume', value: '150ml Cleanser + 50ml Gel' },
      { label: 'Skin Type', value: 'All Skin Types · Oil-Free' },
    ],
    variants: [{ id: 'daily-duo', label: 'Daily Care Duo', colorHex: '#06B6D4' }],
    reviews: [],
  },
];

const SEED_PROMOS: PromoCodeRule[] = [
  { code: 'HRIDOY10', type: 'percent', value: 10, minSubtotal: 1000, label: '10% Welcome Privilege' },
  { code: 'DHAKA500', type: 'flat', value: 500, minSubtotal: 5000, label: '৳500 Flat Savings' },
];

const SEED_ORDERS: Order[] = [
  {
    orderCode: 'BDH-1042',
    createdAt: '12 Nov 2026, 11:20 AM',
    status: 'in_transit',
    estimatedDelivery: '24 Hours (Next-Day Express)',
    customer: {
      fullName: 'Tanvir Ahmed',
      phone: '01711223344',
      division: 'Dhaka',
      district: 'Dhaka Metro',
      areaAddress: 'House 24, Road 11, Banani, Dhaka 1213',
      zone: 'dhaka-metro',
    },
    payment: {
      method: 'bkash',
      trxId: 'BKH9X42LM',
      statusLabel: 'Paid via bKash (TrxID: BKH9X42LM)',
    },
    items: [
      {
        productId: 'wireless-earbuds-tws',
        variantId: 'matte-black',
        variantLabel: 'Matte Black',
        name: 'Wireless Earbuds TWS',
        priceBdt: 1999,
        quantity: 1,
      },
      {
        productId: 'smart-watch-pro',
        variantId: 'emerald-tan',
        variantLabel: 'Silver · Tan Strap',
        name: 'Smart Watch',
        priceBdt: 2999,
        quantity: 1,
      },
    ],
    pricing: {
      subtotalBdt: 4998,
      discountBdt: 500,
      promoCode: 'HRIDOY10',
      deliveryFeeBdt: 60,
      totalBdt: 4558,
    },
    timeline: buildTimeline('in_transit', '12 Nov 2026', 'Dhaka Metro'),
  },
  {
    orderCode: 'BDH-1038',
    createdAt: '10 Nov 2026, 04:15 PM',
    status: 'delivered',
    estimatedDelivery: '48–72 Hours via Express Courier',
    customer: {
      fullName: 'Nafis Chowdhury',
      phone: '01819887766',
      division: 'Chattogram',
      district: 'Chattogram City',
      areaAddress: 'Lane 4, Nasirabad Housing Society, Chattogram',
      zone: 'nationwide',
    },
    payment: {
      method: 'cod',
      statusLabel: 'Cash on Delivery (Settled)',
    },
    items: [
      {
        productId: 'laptop-backpack-urban',
        variantId: 'espresso-brown',
        variantLabel: 'Classic Espresso',
        name: 'Laptop Backpack',
        priceBdt: 1699,
        quantity: 1,
      },
      {
        productId: 'sports-shoes-runner',
        variantId: 'blue-42',
        variantLabel: 'Cobalt Blue · EU 42',
        name: 'Sports Shoes',
        priceBdt: 2499,
        quantity: 1,
      },
    ],
    pricing: {
      subtotalBdt: 4198,
      discountBdt: 0,
      deliveryFeeBdt: 120,
      totalBdt: 4318,
    },
    timeline: buildTimeline('delivered', '10 Nov 2026', 'Chattogram City'),
  },
];

interface StoredReseller extends ResellerAccount {
  passwordHash: string;
}

interface StoreDatabase {
  products: Product[];
  orders: Order[];
  promos: PromoCodeRule[];
  subscribers: NewsletterSubscriber[];
  adSettings: AdSettings;
  siteSettings: SiteSettings;
  resellers: StoredReseller[];
  resellerPayouts: ResellerPayoutRequest[];
}

const DEFAULT_AD_SETTINGS: AdSettings = {
  metaPixelId: '',
  googleTagId: '',
  tiktokPixelId: '',
  defaultUtmSource: 'facebook',
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: 'BdHridoyShop',
  tagline: 'Shop Smart... Live Better...',
  logoUrl: '',
  primaryColor: '#133475',
  accentColor: '#E11D2E',
  topBarText1: 'Free Delivery all over Bangladesh',
  topBarText2: 'Safe & Secure Payment',
  topBarText3: '24/7 Customer Support',
  heroEyebrow: 'Welcome to',
  heroHeadline: 'BdHridoyShop',
  heroSubtitle: 'Shop Smart... Live Better...',
  heroBadgeTop: 'Best Products · Best Price',
  heroBadgeMain: 'Shop Now & Enjoy Amazing Offers!',
  heroBannerUrl: '',
  specialOfferBadge: 'Special Offer',
  specialOfferTitle: 'Flat 50% OFF',
  specialOfferSubtitle: 'on Selected Products',
  specialOfferPromoCode: 'HRIDOY10',
  whyChooseTitle: 'Why Choose BdHridoyShop?',
  whyChooseItems: [
    'Trusted Online Shop',
    'Fast & Free Delivery',
    'Secure Transactions',
    'Friendly Support',
    '100% Customer Satisfaction',
  ],
  whyChooseFooter: 'Thank you for choosing us!',
  whatsappNumber: '01728-999820',
  bkashNumber: '01700-889900',
  nagadNumber: '01700-889900',
  rocketNumber: '01700-8899001',
  addressText: 'Road 11, Banani, Dhaka 1213',
  footerDescription:
    'Your trusted Bangladeshi marketplace for electronics, gadgets, fashion, and everyday home essentials.',
  copyrightText: '© 2026 BdHridoyShop. All rights reserved.',
  showPromoBanner: true,
  showNewsletter: true,
  showWhyChoose: true,
};

function loadDatabase(): StoreDatabase {
  try {
    if (fs.existsSync(DB_STORE_PATH)) {
      const raw = fs.readFileSync(DB_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreDatabase>;
      if (
        Array.isArray(parsed.products) &&
        parsed.products.length > 0 &&
        Array.isArray(parsed.orders) &&
        Array.isArray(parsed.promos)
      ) {
        return {
          products: parsed.products,
          orders: parsed.orders,
          promos: parsed.promos,
          subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
          adSettings: parsed.adSettings
            ? { ...DEFAULT_AD_SETTINGS, ...parsed.adSettings }
            : { ...DEFAULT_AD_SETTINGS },
          siteSettings: parsed.siteSettings
            ? { ...DEFAULT_SITE_SETTINGS, ...parsed.siteSettings }
            : { ...DEFAULT_SITE_SETTINGS },
          resellers: Array.isArray(parsed.resellers) ? parsed.resellers : [],
          resellerPayouts: Array.isArray(parsed.resellerPayouts) ? parsed.resellerPayouts : [],
        };
      }
    }
  } catch {
    // Fallback to initial seed
  }
  return {
    products: [...SEED_PRODUCTS],
    orders: [...SEED_ORDERS],
    promos: [...SEED_PROMOS],
    subscribers: [
      { email: 'tanvir.dhaka@example.com', subscribedAt: '11 Nov 2026' },
      { email: 'nafis.ctg@example.com', subscribedAt: '12 Nov 2026' },
    ],
    adSettings: { ...DEFAULT_AD_SETTINGS },
    siteSettings: { ...DEFAULT_SITE_SETTINGS },
    resellers: [],
    resellerPayouts: [],
  };
}

function saveDatabase(db: StoreDatabase) {
  try {
    fs.writeFileSync(DB_STORE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Continue in memory if /tmp write unavailable
  }
}

function createAdminToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): { valid: boolean; username?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub?: string;
      role?: string;
      exp?: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp || parsed.role !== 'admin') {
      return { valid: false };
    }
    return { valid: true, username: parsed.sub };
  } catch {
    return { valid: false };
  }
}

function hashResellerPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyResellerPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function createResellerToken(reseller: StoredReseller): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: reseller.id,
      code: reseller.code,
      role: 'reseller',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyResellerToken(token: string): { valid: boolean; resellerId?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub?: string;
      role?: string;
      exp?: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp || parsed.role !== 'reseller' || !parsed.sub) {
      return { valid: false };
    }
    return { valid: true, resellerId: parsed.sub };
  } catch {
    return { valid: false };
  }
}

function sanitizeReseller(r: StoredReseller): ResellerAccount {
  return {
    id: r.id,
    code: r.code,
    fullName: r.fullName,
    phone: r.phone,
    shopName: r.shopName,
    payoutMethod: r.payoutMethod,
    payoutNumber: r.payoutNumber,
    status: r.status,
    withdrawnBdt: r.withdrawnBdt,
    createdAt: r.createdAt,
  };
}

function getWholesalePriceBdt(product: Product): number {
  if (typeof product.resellerPriceBdt === 'number' && product.resellerPriceBdt > 0) {
    return Math.round(product.resellerPriceBdt);
  }
  return Math.max(50, Math.round(product.priceBdt * 0.85));
}

function computeResellerStats(
  reseller: StoredReseller,
  orders: Order[],
  payouts: ResellerPayoutRequest[],
): ResellerDashboardStats {
  const ownOrders = orders.filter((o) => o.reseller?.resellerId === reseller.id);
  const deliveredProfitBdt = ownOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.reseller?.profitBdt ?? 0), 0);
  const pendingProfitBdt = ownOrders
    .filter((o) => o.status !== 'delivered')
    .reduce((sum, o) => sum + (o.reseller?.profitBdt ?? 0), 0);
  const pendingOrPaidWithdrawals = payouts
    .filter((p) => p.resellerId === reseller.id)
    .reduce((sum, p) => sum + p.amountBdt, 0);
  const availableBalanceBdt = Math.max(0, deliveredProfitBdt - pendingOrPaidWithdrawals);
  return {
    totalOrders: ownOrders.length,
    deliveredProfitBdt,
    pendingProfitBdt,
    availableBalanceBdt,
    withdrawnBdt: reseller.withdrawnBdt,
  };
}

function safeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const check = verifyAdminToken(token);
  if (!check.valid) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  next();
}

function paymentStatusText(method: PaymentMethod, trxId?: string): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery (Pay upon arrival)';
    case 'bkash':
      return trxId ? `Paid via bKash (TrxID: ${trxId})` : 'Paid via bKash Merchant';
    case 'nagad':
      return trxId ? `Paid via Nagad (TrxID: ${trxId})` : 'Paid via Nagad Merchant';
    case 'rocket':
      return trxId ? `Paid via Rocket (TrxID: ${trxId})` : 'Paid via DBBL Rocket';
    case 'card':
      return trxId ? `Paid via Mastercard / Visa (${trxId})` : 'Authorized via Mastercard / Visa Card';
  }
}

function categoryLabelFromId(cat: Product['category']): string {
  switch (cat) {
    case 'mobiles':
      return 'Mobiles';
    case 'laptops':
      return 'Laptops & Carry';
    case 'accessories':
      return 'Accessories';
    case 'fashion':
      return 'Fashion';
    case 'home-living':
      return 'Home & Living';
    case 'beauty':
      return 'Beauty & Care';
    case 'sports':
      return 'Sports';
    case 'gifts':
      return 'Gifts';
  }
}

function computeOverview(db: StoreDatabase): AdminOverviewStats {
  const totalRevenueBdt = db.orders.reduce((sum, o) => sum + o.pricing.totalBdt, 0);
  const totalOrders = db.orders.length;
  const pendingFulfillment = db.orders.filter((o) => o.status !== 'delivered').length;
  const lowStockCount = db.products.filter((p) => p.stock <= 5).length;
  return {
    totalRevenueBdt,
    totalOrders,
    pendingFulfillment,
    lowStockCount,
    subscriberCount: db.subscribers.length,
  };
}

export function createApiApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = '/api' + (req.url.slice('/.netlify/functions/api'.length) || '');
    }
    next();
  });
  app.use(express.json({ limit: '5mb' }));

  const db = loadDatabase();

  // --- Public Storefront Endpoints ---

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, store: 'BdHridoyShop' });
  });

  app.get('/api/products', (_req: Request, res: Response) => {
    res.json({ products: db.products });
  });

  app.get('/api/ad-settings', (_req: Request, res: Response) => {
    res.json({ adSettings: db.adSettings });
  });

  app.get('/api/site-settings', (_req: Request, res: Response) => {
    res.json({ siteSettings: db.siteSettings });
  });

  app.post('/api/newsletter/subscribe', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const exists = db.subscribers.some((s) => s.email.toLowerCase() === email);
    if (exists) {
      res.json({
        subscribed: true,
        alreadySubscribed: true,
        message: 'You are already subscribed for BdHridoyShop deals and offers!',
      });
      return;
    }

    const entry: NewsletterSubscriber = {
      email,
      subscribedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };
    db.subscribers = [entry, ...db.subscribers];
    saveDatabase(db);

    res.status(201).json({
      subscribed: true,
      alreadySubscribed: false,
      message: 'Subscribed! Watch your inbox for exclusive Bangladesh deals & promo codes.',
    });
  });

  app.post('/api/products/:id/reviews', (req: Request, res: Response) => {
    const productId = String(req.params.id ?? '');
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const author = String(req.body?.author ?? '').trim();
    const city = String(req.body?.city ?? 'Dhaka').trim() || 'Dhaka';
    const rating = Math.max(1, Math.min(5, Number(req.body?.rating) || 5));
    const comment = String(req.body?.comment ?? '').trim();

    if (!author || !comment) {
      res.status(400).json({ error: 'Name and review comment are required.' });
      return;
    }

    const newReview: ProductReview = {
      id: `rev-${Date.now()}`,
      author,
      city,
      rating,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      comment,
    };

    product.reviews = [newReview, ...product.reviews];
    product.reviewCount = product.reviews.length;
    const avg =
      product.reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, product.reviews.length);
    product.rating = Number(avg.toFixed(1));
    saveDatabase(db);

    res.status(201).json({ review: newReview, product });
  });

  app.post('/api/promo/validate', (req: Request, res: Response) => {
    const codeRaw = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const subtotalBdt = typeof req.body?.subtotalBdt === 'number' ? req.body.subtotalBdt : 0;

    const rule = db.promos.find((p) => p.code.toUpperCase() === codeRaw);
    if (!rule) {
      res.status(404).json({
        valid: false,
        message: 'Promo code not recognized. Try HRIDOY10 or DHAKA500.',
      });
      return;
    }

    if (subtotalBdt < rule.minSubtotal) {
      res.status(400).json({
        valid: false,
        message: `Code ${codeRaw} requires a minimum subtotal of ৳${rule.minSubtotal.toLocaleString('en-IN')}.`,
      });
      return;
    }

    const discountBdt =
      rule.type === 'percent' ? Math.round((subtotalBdt * rule.value) / 100) : rule.value;

    res.json({
      valid: true,
      code: rule.code,
      label: rule.label,
      discountBdt,
    });
  });

  app.get('/api/orders/:orderCode', (req: Request, res: Response) => {
    const rawCode = String(req.params.orderCode ?? '').trim().toUpperCase();
    const order = db.orders.find((o) => o.orderCode.toUpperCase() === rawCode);
    if (!order) {
      res.status(404).json({
        error: `No order found matching "${rawCode}". Check your Order ID and try again.`,
      });
      return;
    }
    res.json({ order });
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const customer = body.customer ?? {};
    const payment = body.payment ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const promoCodeInput =
      typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';

    if (
      !customer.fullName ||
      !customer.phone ||
      !customer.division ||
      !customer.district ||
      !customer.areaAddress ||
      rawItems.length === 0
    ) {
      res.status(400).json({
        error: 'Please complete all required delivery details and ensure your bag has items.',
      });
      return;
    }

    const verifiedItems: OrderItem[] = [];
    let subtotalBdt = 0;

    for (const item of rawItems) {
      const product = db.products.find((p) => p.id === String(item.productId ?? ''));
      if (!product) {
        res.status(400).json({ error: `Unknown product in bag: ${String(item.productId ?? '')}` });
        return;
      }
      const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      subtotalBdt += product.priceBdt * quantity;
      verifiedItems.push({
        productId: product.id,
        variantId: String(item.variantId ?? 'default'),
        variantLabel: String(item.variantLabel ?? 'Standard'),
        name: product.name,
        priceBdt: product.priceBdt,
        quantity,
      });
    }

    for (const vItem of verifiedItems) {
      const prod = db.products.find((p) => p.id === vItem.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - vItem.quantity);
      }
    }

    let discountBdt = 0;
    let appliedPromo: string | undefined;
    const matchedPromo = db.promos.find((p) => p.code.toUpperCase() === promoCodeInput);
    if (matchedPromo && subtotalBdt >= matchedPromo.minSubtotal) {
      discountBdt =
        matchedPromo.type === 'percent'
          ? Math.round((subtotalBdt * matchedPromo.value) / 100)
          : matchedPromo.value;
      appliedPromo = matchedPromo.code;
    }

    const zone: BangladeshZone =
      customer.zone === 'dhaka-metro' ||
      customer.zone === 'sub-dhaka' ||
      customer.zone === 'nationwide'
        ? customer.zone
        : 'nationwide';

    const subtotalAfterDiscount = Math.max(0, subtotalBdt - discountBdt);
    const deliveryFeeBdt =
      subtotalAfterDiscount >= FREE_DELIVERY_THRESHOLD_BDT ? 0 : ZONE_FEES[zone].fee;
    const totalBdt = subtotalAfterDiscount + deliveryFeeBdt;

    const method: PaymentMethod =
      payment.method === 'bkash' ||
      payment.method === 'nagad' ||
      payment.method === 'rocket' ||
      payment.method === 'card' ||
      payment.method === 'cod'
        ? payment.method
        : 'cod';

    const nextNum = 1043 + db.orders.length;
    const orderCode = `BDH-${nextNum}`;
    const nowFormatted = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newOrder: Order = {
      orderCode,
      createdAt: nowFormatted,
      status: 'confirmed',
      estimatedDelivery: ZONE_FEES[zone].eta,
      customer: {
        fullName: String(customer.fullName).trim(),
        phone: String(customer.phone).trim(),
        division: String(customer.division),
        district: String(customer.district),
        areaAddress: String(customer.areaAddress).trim(),
        zone,
      },
      payment: {
        method,
        trxId: payment.trxId ? String(payment.trxId).trim().toUpperCase() : undefined,
        statusLabel: paymentStatusText(
          method,
          payment.trxId ? String(payment.trxId).trim().toUpperCase() : undefined,
        ),
      },
      items: verifiedItems,
      pricing: {
        subtotalBdt,
        discountBdt,
        promoCode: appliedPromo,
        deliveryFeeBdt,
        totalBdt,
      },
      timeline: buildTimeline('confirmed', nowFormatted, String(customer.district)),
      ...(typeof req.body?.resellerCode === 'string' && req.body.resellerCode.trim()
        ? (() => {
            const refCode = req.body.resellerCode.trim().toUpperCase();
            const matchedReseller = db.resellers.find(
              (r) => r.code.toUpperCase() === refCode && r.status === 'active',
            );
            if (!matchedReseller) return {};
            const commissionBdt = verifiedItems.reduce((sum, it) => {
              const prod = db.products.find((p) => p.id === it.productId);
              const wholesale = prod ? getWholesalePriceBdt(prod) : Math.round(it.priceBdt * 0.85);
              return sum + Math.max(0, it.priceBdt - wholesale) * it.quantity;
            }, 0);
            return {
              reseller: {
                resellerId: matchedReseller.id,
                resellerCode: matchedReseller.code,
                shopName: matchedReseller.shopName,
                profitBdt: commissionBdt,
              },
            };
          })()
        : {}),
    };

    db.orders = [newOrder, ...db.orders];
    saveDatabase(db);

    res.status(201).json({ order: newOrder });
  });

  // --- Reseller Channel Endpoints ---

  const requireReseller = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Reseller authentication required.' });
      return;
    }
    const check = verifyResellerToken(token);
    if (!check.valid || !check.resellerId) {
      res.status(401).json({ error: 'Reseller session expired. Please sign in again.' });
      return;
    }
    const reseller = db.resellers.find((r) => r.id === check.resellerId);
    if (!reseller) {
      res.status(401).json({ error: 'Reseller account not found.' });
      return;
    }
    if (reseller.status !== 'active') {
      res.status(403).json({ error: 'Your reseller account is currently suspended by store admin.' });
      return;
    }
    (req as Request & { reseller?: StoredReseller }).reseller = reseller;
    next();
  };

  app.post('/api/reseller/register', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const fullName = String(body.fullName ?? '').trim();
    const phone = String(body.phone ?? '').replace(/[\s-]/g, '').trim();
    const shopName = String(body.shopName ?? '').trim();
    const password = String(body.password ?? '');
    const payoutMethod: ResellerAccount['payoutMethod'] =
      body.payoutMethod === 'nagad' || body.payoutMethod === 'rocket' ? body.payoutMethod : 'bkash';
    const payoutNumber = String(body.payoutNumber ?? phone).replace(/[\s-]/g, '').trim();

    if (!fullName || !shopName || !/^(?:\+?88)?01[3-9]\d{8}$/.test(phone) || password.length < 6) {
      res.status(400).json({
        error: 'Enter full name, shop/page name, valid BD mobile number, and password (6+ chars).',
      });
      return;
    }

    const normalizedPhone = phone.replace(/^\+?88/, '');
    const exists = db.resellers.some((r) => r.phone === normalizedPhone);
    if (exists) {
      res.status(409).json({ error: 'This mobile number is already registered as a reseller. Please sign in.' });
      return;
    }

    const codeNum = 101 + db.resellers.length;
    const newReseller: StoredReseller = {
      id: `rsl-${Date.now().toString(36)}`,
      code: `RSL-${codeNum}`,
      fullName,
      phone: normalizedPhone,
      shopName,
      payoutMethod,
      payoutNumber: payoutNumber || normalizedPhone,
      status: 'active',
      withdrawnBdt: 0,
      createdAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      passwordHash: hashResellerPassword(password),
    };

    db.resellers = [newReseller, ...db.resellers];
    saveDatabase(db);

    const token = createResellerToken(newReseller);
    res.status(201).json({ token, reseller: sanitizeReseller(newReseller) });
  });

  app.post('/api/reseller/login', (req: Request, res: Response) => {
    const phone = String(req.body?.phone ?? '').replace(/[\s-]/g, '').replace(/^\+?88/, '').trim();
    const password = String(req.body?.password ?? '');

    if (!phone || !password) {
      res.status(400).json({ error: 'Mobile number and password are required.' });
      return;
    }

    const reseller = db.resellers.find((r) => r.phone === phone);
    if (!reseller || !verifyResellerPassword(password, reseller.passwordHash)) {
      res.status(401).json({ error: 'Invalid mobile number or password.' });
      return;
    }
    if (reseller.status !== 'active') {
      res.status(403).json({ error: 'Your reseller account is suspended. Contact store admin.' });
      return;
    }

    const token = createResellerToken(reseller);
    res.json({ token, reseller: sanitizeReseller(reseller) });
  });

  app.get('/api/reseller/dashboard', requireReseller, (req: Request, res: Response) => {
    const reseller = (req as Request & { reseller: StoredReseller }).reseller;
    const catalog = db.products.map((p) => ({
      ...p,
      resellerPriceBdt: getWholesalePriceBdt(p),
    }));
    const ownOrders = db.orders.filter((o) => o.reseller?.resellerId === reseller.id);
    const ownPayouts = db.resellerPayouts.filter((p) => p.resellerId === reseller.id);

    res.json({
      reseller: sanitizeReseller(reseller),
      products: catalog,
      orders: ownOrders,
      payouts: ownPayouts,
      stats: computeResellerStats(reseller, db.orders, db.resellerPayouts),
    });
  });

  app.post('/api/reseller/orders', requireReseller, (req: Request, res: Response) => {
    const reseller = (req as Request & { reseller: StoredReseller }).reseller;
    const { customer, items, payment } = req.body ?? {};

    if (!customer?.fullName || !customer?.phone || !customer?.areaAddress || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Customer name, phone, full address, and product are required.' });
      return;
    }

    const verifiedItems: OrderItem[] = [];
    let subtotalBdt = 0;
    let totalProfitBdt = 0;

    for (const raw of items) {
      const product = db.products.find((p) => p.id === raw.productId);
      if (!product) {
        res.status(400).json({ error: 'Selected product no longer exists.' });
        return;
      }
      const qty = Math.max(1, Math.min(20, Number(raw.quantity) || 1));
      if (product.stock < qty) {
        res.status(409).json({ error: `Insufficient stock for ${product.name}.` });
        return;
      }
      const wholesalePrice = getWholesalePriceBdt(product);
      const requestedSelling = Math.round(Number(raw.sellingPriceBdt) || product.priceBdt);
      if (requestedSelling < wholesalePrice) {
        res.status(400).json({
          error: `Customer price for ${product.name} cannot be lower than wholesale price (৳${wholesalePrice}).`,
        });
        return;
      }
      product.stock -= qty;
      subtotalBdt += requestedSelling * qty;
      totalProfitBdt += (requestedSelling - wholesalePrice) * qty;
      verifiedItems.push({
        productId: product.id,
        variantId: String(raw.variantId || product.variants[0]?.id || 'standard'),
        variantLabel: String(raw.variantLabel || product.variants[0]?.label || 'Standard'),
        name: product.name,
        priceBdt: requestedSelling,
        quantity: qty,
      });
    }

    const zone: BangladeshZone =
      customer.zone === 'dhaka-metro' || customer.zone === 'sub-dhaka' || customer.zone === 'nationwide'
        ? customer.zone
        : 'nationwide';
    const deliveryFeeBdt = subtotalBdt >= FREE_DELIVERY_THRESHOLD_BDT ? 0 : ZONE_FEES[zone].fee;
    const totalBdt = subtotalBdt + deliveryFeeBdt;

    const method: PaymentMethod =
      payment?.method === 'bkash' ||
      payment?.method === 'nagad' ||
      payment?.method === 'rocket' ||
      payment?.method === 'card' ||
      payment?.method === 'cod'
        ? payment.method
        : 'cod';

    const orderCode = `BDH-${1043 + db.orders.length}`;
    const nowFormatted = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newOrder: Order = {
      orderCode,
      createdAt: nowFormatted,
      status: 'confirmed',
      estimatedDelivery: ZONE_FEES[zone].eta,
      customer: {
        fullName: String(customer.fullName).trim(),
        phone: String(customer.phone).trim(),
        division: String(customer.division || 'Dhaka'),
        district: String(customer.district || 'Dhaka Metro'),
        areaAddress: String(customer.areaAddress).trim(),
        zone,
      },
      payment: {
        method,
        trxId: payment?.trxId ? String(payment.trxId).trim().toUpperCase() : undefined,
        statusLabel: paymentStatusText(
          method,
          payment?.trxId ? String(payment.trxId).trim().toUpperCase() : undefined,
        ),
      },
      items: verifiedItems,
      pricing: {
        subtotalBdt,
        discountBdt: 0,
        deliveryFeeBdt,
        totalBdt,
      },
      timeline: buildTimeline('confirmed', nowFormatted, String(customer.district || 'Dhaka')),
      reseller: {
        resellerId: reseller.id,
        resellerCode: reseller.code,
        shopName: reseller.shopName,
        profitBdt: totalProfitBdt,
      },
    };

    db.orders = [newOrder, ...db.orders];
    saveDatabase(db);

    res.status(201).json({
      order: newOrder,
      stats: computeResellerStats(reseller, db.orders, db.resellerPayouts),
    });
  });

  app.post('/api/reseller/payouts', requireReseller, (req: Request, res: Response) => {
    const reseller = (req as Request & { reseller: StoredReseller }).reseller;
    const stats = computeResellerStats(reseller, db.orders, db.resellerPayouts);
    const amountBdt = Math.round(Number(req.body?.amountBdt) || 0);
    const method: ResellerAccount['payoutMethod'] =
      req.body?.method === 'nagad' || req.body?.method === 'rocket' ? req.body.method : 'bkash';
    const accountNumber = String(req.body?.accountNumber ?? reseller.payoutNumber).trim();

    if (amountBdt < 200) {
      res.status(400).json({ error: 'Minimum payout request is ৳200.' });
      return;
    }
    if (amountBdt > stats.availableBalanceBdt) {
      res.status(400).json({ error: `Requested amount exceeds available balance (৳${stats.availableBalanceBdt}).` });
      return;
    }
    if (!accountNumber) {
      res.status(400).json({ error: 'Payout mobile number is required.' });
      return;
    }

    const payout: ResellerPayoutRequest = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      resellerId: reseller.id,
      resellerCode: reseller.code,
      shopName: reseller.shopName,
      amountBdt,
      method,
      accountNumber,
      status: 'pending',
      requestedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };

    db.resellerPayouts = [payout, ...db.resellerPayouts];
    saveDatabase(db);

    res.status(201).json({
      payout,
      payouts: db.resellerPayouts.filter((p) => p.resellerId === reseller.id),
      stats: computeResellerStats(reseller, db.orders, db.resellerPayouts),
    });
  });

  // --- Admin Auth & Protected Endpoints ---
  const loginFailures = new Map<string, { count: number; resetAt: number }>();

  app.all(['/api/admin/signup', '/api/admin/register', '/api/admin/create'], (_req: Request, res: Response) => {
    res.status(403).json({
      error: 'Admin registration is disabled. Only the authorized store owner can sign in.',
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const clientIp = String(req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const record = loginFailures.get(clientIp);
    if (record && now < record.resetAt && record.count >= 5) {
      const waitMins = Math.ceil((record.resetAt - now) / 60000);
      res.status(429).json({
        error: `Too many failed login attempts. Try again in ${waitMins} minute(s).`,
      });
      return;
    }

    const username = String(req.body?.username ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!username || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const userValid = safeCompareStrings(username, ADMIN_USERNAME);
    const passValid = safeCompareStrings(password, ADMIN_PASSWORD);

    if (!userValid || !passValid) {
      const nextCount = record && now < record.resetAt ? record.count + 1 : 1;
      loginFailures.set(clientIp, {
        count: nextCount,
        resetAt: record && now < record.resetAt ? record.resetAt : now + 15 * 60 * 1000,
      });
      res.status(401).json({ error: 'Access denied. Invalid admin credentials.' });
      return;
    }

    loginFailures.delete(clientIp);
    const token = createAdminToken(ADMIN_USERNAME);
    res.json({ token, username: ADMIN_USERNAME });
  });

  app.get('/api/admin/session', requireAdmin, (_req: Request, res: Response) => {
    res.json({ authenticated: true, username: ADMIN_USERNAME });
  });

  app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
    res.json({
      stats: computeOverview(db),
      orders: db.orders,
      products: db.products,
      promos: db.promos,
      subscribers: db.subscribers,
      adSettings: db.adSettings,
      siteSettings: db.siteSettings,
      resellers: db.resellers.map(sanitizeReseller),
      resellerPayouts: db.resellerPayouts,
    });
  });

  app.patch('/api/admin/resellers/:id/status', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const reseller = db.resellers.find((r) => r.id === id);
    if (!reseller) {
      res.status(404).json({ error: 'Reseller not found.' });
      return;
    }
    reseller.status = req.body?.status === 'suspended' ? 'suspended' : 'active';
    saveDatabase(db);
    res.json({ resellers: db.resellers.map(sanitizeReseller) });
  });

  app.patch('/api/admin/reseller-payouts/:id/pay', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const payout = db.resellerPayouts.find((p) => p.id === id);
    if (!payout) {
      res.status(404).json({ error: 'Payout request not found.' });
      return;
    }
    if (payout.status !== 'paid') {
      payout.status = 'paid';
      payout.paidAt = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const reseller = db.resellers.find((r) => r.id === payout.resellerId);
      if (reseller) {
        reseller.withdrawnBdt += payout.amountBdt;
      }
      saveDatabase(db);
    }
    res.json({
      resellerPayouts: db.resellerPayouts,
      resellers: db.resellers.map(sanitizeReseller),
    });
  });

  app.patch('/api/admin/site-settings', requireAdmin, (req: Request, res: Response) => {
    const body = req.body ?? {};
    const validHex = (val: unknown, fallback: string) => {
      const s = String(val ?? '').trim();
      return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
    };
    const items = Array.isArray(body.whyChooseItems)
      ? body.whyChooseItems.map((i: unknown) => String(i ?? '').trim()).filter(Boolean).slice(0, 8)
      : db.siteSettings.whyChooseItems;

    db.siteSettings = {
      storeName: String(body.storeName ?? db.siteSettings.storeName).trim().slice(0, 48) || DEFAULT_SITE_SETTINGS.storeName,
      tagline: String(body.tagline ?? db.siteSettings.tagline).trim().slice(0, 80),
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl.trim() : db.siteSettings.logoUrl,
      primaryColor: validHex(body.primaryColor, db.siteSettings.primaryColor),
      accentColor: validHex(body.accentColor, db.siteSettings.accentColor),
      topBarText1: String(body.topBarText1 ?? db.siteSettings.topBarText1).trim().slice(0, 80),
      topBarText2: String(body.topBarText2 ?? db.siteSettings.topBarText2).trim().slice(0, 80),
      topBarText3: String(body.topBarText3 ?? db.siteSettings.topBarText3).trim().slice(0, 80),
      heroEyebrow: String(body.heroEyebrow ?? db.siteSettings.heroEyebrow).trim().slice(0, 60),
      heroHeadline: String(body.heroHeadline ?? db.siteSettings.heroHeadline).trim().slice(0, 80) || DEFAULT_SITE_SETTINGS.heroHeadline,
      heroSubtitle: String(body.heroSubtitle ?? db.siteSettings.heroSubtitle).trim().slice(0, 140),
      heroBadgeTop: String(body.heroBadgeTop ?? db.siteSettings.heroBadgeTop).trim().slice(0, 60),
      heroBadgeMain: String(body.heroBadgeMain ?? db.siteSettings.heroBadgeMain).trim().slice(0, 80),
      heroBannerUrl: typeof body.heroBannerUrl === 'string' ? body.heroBannerUrl.trim() : db.siteSettings.heroBannerUrl,
      specialOfferBadge: String(body.specialOfferBadge ?? db.siteSettings.specialOfferBadge).trim().slice(0, 40),
      specialOfferTitle: String(body.specialOfferTitle ?? db.siteSettings.specialOfferTitle).trim().slice(0, 60),
      specialOfferSubtitle: String(body.specialOfferSubtitle ?? db.siteSettings.specialOfferSubtitle).trim().slice(0, 80),
      specialOfferPromoCode: String(body.specialOfferPromoCode ?? db.siteSettings.specialOfferPromoCode).trim().toUpperCase().slice(0, 24),
      whyChooseTitle: String(body.whyChooseTitle ?? db.siteSettings.whyChooseTitle).trim().slice(0, 60),
      whyChooseItems: items.length > 0 ? items : DEFAULT_SITE_SETTINGS.whyChooseItems,
      whyChooseFooter: String(body.whyChooseFooter ?? db.siteSettings.whyChooseFooter).trim().slice(0, 80),
      whatsappNumber: String(body.whatsappNumber ?? db.siteSettings.whatsappNumber).trim().slice(0, 24) || DEFAULT_SITE_SETTINGS.whatsappNumber,
      bkashNumber: String(body.bkashNumber ?? db.siteSettings.bkashNumber ?? DEFAULT_SITE_SETTINGS.bkashNumber).trim().slice(0, 24) || DEFAULT_SITE_SETTINGS.bkashNumber,
      nagadNumber: String(body.nagadNumber ?? db.siteSettings.nagadNumber ?? DEFAULT_SITE_SETTINGS.nagadNumber).trim().slice(0, 24) || DEFAULT_SITE_SETTINGS.nagadNumber,
      rocketNumber: String(body.rocketNumber ?? db.siteSettings.rocketNumber ?? DEFAULT_SITE_SETTINGS.rocketNumber).trim().slice(0, 24) || DEFAULT_SITE_SETTINGS.rocketNumber,
      addressText: String(body.addressText ?? db.siteSettings.addressText).trim().slice(0, 120),
      footerDescription: String(body.footerDescription ?? db.siteSettings.footerDescription).trim().slice(0, 260),
      copyrightText: String(body.copyrightText ?? db.siteSettings.copyrightText).trim().slice(0, 120),
      showPromoBanner: typeof body.showPromoBanner === 'boolean' ? body.showPromoBanner : db.siteSettings.showPromoBanner,
      showNewsletter: typeof body.showNewsletter === 'boolean' ? body.showNewsletter : db.siteSettings.showNewsletter,
      showWhyChoose: typeof body.showWhyChoose === 'boolean' ? body.showWhyChoose : db.siteSettings.showWhyChoose,
    };
    saveDatabase(db);
    res.json({ siteSettings: db.siteSettings });
  });

  app.patch('/api/admin/ad-settings', requireAdmin, (req: Request, res: Response) => {
    const body = req.body ?? {};
    db.adSettings = {
      metaPixelId: String(body.metaPixelId ?? db.adSettings.metaPixelId ?? '').trim().slice(0, 40),
      googleTagId: String(body.googleTagId ?? db.adSettings.googleTagId ?? '').trim().slice(0, 40),
      tiktokPixelId: String(body.tiktokPixelId ?? db.adSettings.tiktokPixelId ?? '').trim().slice(0, 40),
      defaultUtmSource:
        String(body.defaultUtmSource ?? db.adSettings.defaultUtmSource ?? 'facebook')
          .trim()
          .toLowerCase()
          .slice(0, 32) || 'facebook',
    };
    saveDatabase(db);
    res.json({ adSettings: db.adSettings });
  });

  app.patch('/api/admin/orders/:orderCode/status', requireAdmin, (req: Request, res: Response) => {
    const rawCode = String(req.params.orderCode ?? '').trim().toUpperCase();
    const status = String(req.body?.status ?? '') as OrderStatus;

    if (
      status !== 'confirmed' &&
      status !== 'packed' &&
      status !== 'in_transit' &&
      status !== 'delivered'
    ) {
      res.status(400).json({ error: 'Invalid fulfillment status.' });
      return;
    }

    const order = db.orders.find((o) => o.orderCode.toUpperCase() === rawCode);
    if (!order) {
      res.status(404).json({ error: `Order ${rawCode} not found.` });
      return;
    }

    order.status = status;
    const stamp = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    order.timeline = buildTimeline(status, stamp, order.customer.district);
    if (status === 'delivered' && order.payment.method === 'cod') {
      order.payment.statusLabel = 'Cash on Delivery (Settled)';
    }
    saveDatabase(db);

    res.json({ order, stats: computeOverview(db) });
  });

  app.post('/api/admin/products/import-url', requireAdmin, async (req: Request, res: Response) => {
    const rawUrl = String(req.body?.url ?? '').trim();
    if (!rawUrl) {
      res.status(400).json({ error: 'Please paste a Daraz, Amazon, or store product URL.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL. Include https:// at the start.' });
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      res.status(400).json({ error: 'Only HTTP/HTTPS product links are supported.' });
      return;
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      res.status(400).json({ error: 'Local or private network URLs are not allowed.' });
      return;
    }

    const detectPlatform = (h: string): string => {
      if (h.includes('daraz.')) return 'Daraz';
      if (h.includes('amazon.') || h.includes('amzn.')) return 'Amazon';
      if (h.includes('aliexpress.')) return 'AliExpress';
      if (h.includes('pickaboo.')) return 'Pickaboo';
      if (h.includes('startech.')) return 'StarTech';
      if (h.includes('chaldal.')) return 'Chaldal';
      if (h.includes('rokomari.')) return 'Rokomari';
      const cleaned = h.replace(/^www\./, '').split('.')[0] || 'External';
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    const sourcePlatform = detectPlatform(host);

    const decodeHtml = (str: string) =>
      str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

    const extractMeta = (html: string, keys: string[]): string => {
      for (const key of keys) {
        const re1 = new RegExp(
          `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
          'i',
        );
        const re2 = new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
          'i',
        );
        const m = html.match(re1) || html.match(re2);
        if (m?.[1]) return decodeHtml(m[1]);
      }
      return '';
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7500);
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timer);

      if (!response.ok) {
        res.json({
          fetched: false,
          sourcePlatform,
          externalUrl: parsedUrl.toString(),
          notice: `${sourcePlatform} blocked automated preview (HTTP ${response.status}). Your link is attached—please fill in the title, BDT price, and photo below.`,
        });
        return;
      }

      const html = await response.text();
      let title = extractMeta(html, ['og:title', 'twitter:title']);
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch?.[1]) title = decodeHtml(titleMatch[1]);
      }
      title = title
        .replace(/\s*[\|\-:]\s*(Daraz\.com\.bd|Daraz|Amazon\.com|Amazon\.in|Amazon|AliExpress).*$/i, '')
        .replace(/^Amazon\.com\s*:\s*/i, '')
        .trim();

      const shortDesc = extractMeta(html, ['og:description', 'twitter:description', 'description']);
      let image = extractMeta(html, ['og:image', 'twitter:image', 'twitter:image:src']);
      if (image && image.startsWith('//')) {
        image = `https:${image}`;
      } else if (image && image.startsWith('/')) {
        image = `${parsedUrl.origin}${image}`;
      }

      let priceBdt: number | undefined;
      const metaPrice = extractMeta(html, ['product:price:amount', 'og:price:amount']);
      if (metaPrice) {
        const num = Number(metaPrice.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(num) && num > 0) priceBdt = Math.round(num);
      }
      if (!priceBdt) {
        const jsonLdPrice = html.match(/"price"\s*:\s*"?([\d.,]+)"?/i);
        if (jsonLdPrice?.[1]) {
          const num = Number(jsonLdPrice[1].replace(/,/g, ''));
          if (Number.isFinite(num) && num > 0) priceBdt = Math.round(num);
        }
      }
      if (!priceBdt) {
        const takaMatch = html.match(/(?:৳|BDT|Tk\.?)\s*([\d,]+)/i);
        if (takaMatch?.[1]) {
          const num = Number(takaMatch[1].replace(/,/g, ''));
          if (Number.isFinite(num) && num > 0) priceBdt = Math.round(num);
        }
      }

      if (!title && !image) {
        res.json({
          fetched: false,
          sourcePlatform,
          externalUrl: parsedUrl.toString(),
          notice: `${sourcePlatform} uses dynamic protection, so auto-preview couldn't read fields. Your link is attached—enter the title, price, and photo below.`,
        });
        return;
      }

      res.json({
        fetched: true,
        sourcePlatform,
        externalUrl: parsedUrl.toString(),
        name: title.slice(0, 140),
        shortDesc: shortDesc.slice(0, 260),
        image,
        priceBdt,
        notice: `Fetched details from ${sourcePlatform}! Review the BDT price & category below before saving.`,
      });
    } catch {
      res.json({
        fetched: false,
        sourcePlatform,
        externalUrl: parsedUrl.toString(),
        notice: `Could not auto-fetch from ${sourcePlatform} (timeout or bot shield). Your link is attached—please fill in the details below.`,
      });
    }
  });

  app.post('/api/admin/products', requireAdmin, (req: Request, res: Response) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    const category = body.category as Product['category'];
    const origin = String(body.origin ?? 'Dhaka Studio').trim();
    const priceBdt = Number(body.priceBdt);
    const compareAtBdt = body.compareAtBdt ? Number(body.compareAtBdt) : undefined;
    const stock = Math.max(0, Number(body.stock) || 0);
    const shortDesc = String(body.shortDesc ?? '').trim();
    const story = String(body.story ?? shortDesc).trim();
    const availabilityNote =
      body.availabilityNote === 'Limited Run' ? 'Limited Run' : 'In Stock';
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    const imageKey = String(body.imageKey ?? 'showroom').trim();
    const sourcePlatform = String(body.sourcePlatform ?? '').trim();
    const externalUrl = String(body.externalUrl ?? '').trim();
    const actionMode: Product['actionMode'] =
      body.actionMode === 'external' || body.actionMode === 'both' ? body.actionMode : 'direct';
    const adBadge = String(body.adBadge ?? '').trim();
    const resellerPriceBdt =
      typeof body.resellerPriceBdt === 'number' && body.resellerPriceBdt > 0
        ? Math.round(body.resellerPriceBdt)
        : body.resellerPriceBdt
          ? Math.round(Number(body.resellerPriceBdt))
          : undefined;

    if (!name || !shortDesc || !Number.isFinite(priceBdt) || priceBdt <= 0) {
      res.status(400).json({
        error: 'Product name, valid BDT price, and description are required.',
      });
      return;
    }

    const validCategories: Array<Product['category']> = [
      'mobiles',
      'laptops',
      'accessories',
      'fashion',
      'home-living',
      'beauty',
      'sports',
      'gifts',
    ];
    const validCategory: Product['category'] = validCategories.includes(category)
      ? category
      : 'accessories';

    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

    const discountPercent =
      compareAtBdt && compareAtBdt > priceBdt
        ? Math.round(((compareAtBdt - priceBdt) / compareAtBdt) * 100)
        : undefined;

    const newProduct: Product = {
      id: slug,
      slug,
      name,
      category: validCategory,
      categoryLabel: categoryLabelFromId(validCategory),
      origin: origin || (sourcePlatform ? `${sourcePlatform} Partner` : 'BdHridoy Verified'),
      priceBdt: Math.round(priceBdt),
      ...(resellerPriceBdt && resellerPriceBdt > 0 ? { resellerPriceBdt } : {}),
      compareAtBdt:
        compareAtBdt && compareAtBdt > priceBdt ? Math.round(compareAtBdt) : undefined,
      discountPercent,
      stock,
      availabilityNote,
      rating: 5.0,
      reviewCount: 0,
      image,
      imageKey,
      shortDesc,
      story,
      specs: [
        { label: 'Source', value: sourcePlatform || origin || 'BdHridoy Verified' },
        {
          label: 'Fulfillment',
          value: externalUrl ? `Partner Link (${sourcePlatform || 'External Store'})` : 'All 64 Districts Express',
        },
      ],
      variants: [{ id: 'standard', label: 'Standard Edition', colorHex: '#133475' }],
      reviews: [],
      ...(sourcePlatform ? { sourcePlatform } : {}),
      ...(externalUrl ? { externalUrl } : {}),
      actionMode,
      ...(adBadge ? { adBadge } : {}),
    };

    db.products = [newProduct, ...db.products];
    saveDatabase(db);

    res.status(201).json({ product: newProduct, stats: computeOverview(db) });
  });

  app.patch('/api/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const product = db.products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const body = req.body ?? {};
    if (typeof body.name === 'string' && body.name.trim()) {
      product.name = body.name.trim();
    }
    if (typeof body.shortDesc === 'string' && body.shortDesc.trim()) {
      product.shortDesc = body.shortDesc.trim();
    }
    if (typeof body.origin === 'string' && body.origin.trim()) {
      product.origin = body.origin.trim();
    }
    const validCategories: Array<Product['category']> = [
      'mobiles',
      'laptops',
      'accessories',
      'fashion',
      'home-living',
      'beauty',
      'sports',
      'gifts',
    ];
    if (validCategories.includes(body.category)) {
      product.category = body.category;
      product.categoryLabel = categoryLabelFromId(body.category);
    }
    if (typeof body.priceBdt === 'number' && body.priceBdt > 0) {
      product.priceBdt = Math.round(body.priceBdt);
    }
    if (body.compareAtBdt === null || body.compareAtBdt === 0) {
      product.compareAtBdt = undefined;
      product.discountPercent = undefined;
    } else if (typeof body.compareAtBdt === 'number' && body.compareAtBdt > product.priceBdt) {
      product.compareAtBdt = Math.round(body.compareAtBdt);
      product.discountPercent = Math.round(
        ((product.compareAtBdt - product.priceBdt) / product.compareAtBdt) * 100,
      );
    } else if (product.compareAtBdt && product.compareAtBdt > product.priceBdt) {
      product.discountPercent = Math.round(
        ((product.compareAtBdt - product.priceBdt) / product.compareAtBdt) * 100,
      );
    } else {
      product.discountPercent = undefined;
    }
    if (typeof body.stock === 'number' && body.stock >= 0) {
      product.stock = Math.round(body.stock);
    }
    if (typeof body.image === 'string') {
      product.image = body.image.trim();
    }
    if (typeof body.imageKey === 'string' && body.imageKey.trim()) {
      product.imageKey = body.imageKey.trim();
    }
    if (body.availabilityNote === 'In Stock' || body.availabilityNote === 'Limited Run') {
      product.availabilityNote = body.availabilityNote;
    }
    if (typeof body.sourcePlatform === 'string') {
      product.sourcePlatform = body.sourcePlatform.trim() || undefined;
    }
    if (typeof body.externalUrl === 'string') {
      product.externalUrl = body.externalUrl.trim() || undefined;
    }
    if (body.actionMode === 'direct' || body.actionMode === 'external' || body.actionMode === 'both') {
      product.actionMode = body.actionMode;
    }
    if (typeof body.adBadge === 'string') {
      product.adBadge = body.adBadge.trim() || undefined;
    }
    if (body.resellerPriceBdt === null || body.resellerPriceBdt === 0) {
      product.resellerPriceBdt = undefined;
    } else if (Number(body.resellerPriceBdt) > 0) {
      product.resellerPriceBdt = Math.round(Number(body.resellerPriceBdt));
    }

    saveDatabase(db);
    res.json({ product, stats: computeOverview(db) });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const prevLen = db.products.length;
    db.products = db.products.filter((p) => p.id !== id);
    if (db.products.length === prevLen) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ deletedId: id, stats: computeOverview(db) });
  });

  app.post('/api/admin/promos', requireAdmin, (req: Request, res: Response) => {
    const code = String(req.body?.code ?? '').trim().toUpperCase();
    const type = req.body?.type === 'flat' ? 'flat' : 'percent';
    const value = Number(req.body?.value);
    const minSubtotal = Math.max(0, Number(req.body?.minSubtotal) || 0);
    const label = String(req.body?.label ?? '').trim() || `${code} Savings`;

    if (!code || !/^[A-Z0-9_-]{3,20}$/.test(code) || !Number.isFinite(value) || value <= 0) {
      res.status(400).json({
        error: 'Provide an alphanumeric promo code (3–20 chars) and positive value.',
      });
      return;
    }

    const rule: PromoCodeRule = {
      code,
      type,
      value: Math.round(value),
      minSubtotal: Math.round(minSubtotal),
      label,
    };

    const existingIdx = db.promos.findIndex((p) => p.code.toUpperCase() === code);
    if (existingIdx >= 0) {
      db.promos[existingIdx] = rule;
    } else {
      db.promos = [rule, ...db.promos];
    }
    saveDatabase(db);

    res.status(201).json({ promo: rule, promos: db.promos });
  });

  app.delete('/api/admin/promos/:code', requireAdmin, (req: Request, res: Response) => {
    const code = String(req.params.code ?? '').trim().toUpperCase();
    const prevLen = db.promos.length;
    db.promos = db.promos.filter((p) => p.code.toUpperCase() !== code);
    if (db.promos.length === prevLen) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ deletedCode: code, promos: db.promos });
  });

  app.get('/api/admin/download-source', requireAdmin, (_req: Request, res: Response) => {
    try {
      const rootDir = process.cwd();
      const rootFiles = [
        'package.json',
        'index.html',
        'metadata.json',
        'tsconfig.json',
        'vite.config.ts',
        'server.ts',
        'netlify.toml',
        '.env.example',
        '.gitignore',
      ];

      const collected: Array<{ relPath: string; content: Buffer }> = [];

      for (const fileName of rootFiles) {
        const fullPath = path.join(rootDir, fileName);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          collected.push({ relPath: fileName, content: fs.readFileSync(fullPath) });
        }
      }

      const walkDir = (dirPath: string, relBase: string) => {
        if (!fs.existsSync(dirPath)) return;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dirPath, entry.name);
          const rel = `${relBase}/${entry.name}`;
          if (entry.isDirectory()) {
            walkDir(full, rel);
          } else if (entry.isFile()) {
            collected.push({ relPath: rel, content: fs.readFileSync(full) });
          }
        }
      };

      walkDir(path.join(rootDir, 'src'), 'src');
      walkDir(path.join(rootDir, 'netlify'), 'netlify');

      // Include live storefront configuration & catalog snapshot (no secrets or customer PII)
      const snapshot = {
        exportedAt: new Date().toISOString(),
        siteSettings: db.siteSettings,
        adSettings: db.adSettings,
        promos: db.promos,
        products: db.products,
      };
      collected.push({
        relPath: 'store-snapshot.json',
        content: Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8'),
      });

      const readmeContent = [
        '# BdHridoyShop — Full-Stack E-Commerce Source Code',
        '',
        '## Included Features',
        '- Full Bangladesh e-commerce storefront (bKash, Nagad, Rocket, Mastercard/Visa, Cash on Delivery)',
        '- Protected Admin Panel (/admin) with Products, Orders, Resellers, Promo Codes & Newsletter Subscribers',
        '- Reseller Channel (/reseller) with Wholesale pricing, referral tracking, dropship orders & payouts',
        '- Daraz / Amazon / External Store product link importer + affiliate/direct buy buttons',
        '- Ads & Pixels manager (Meta Pixel, Google Ads/GA4, TikTok Pixel, Campaign URL builder)',
        '- Site Design Customizer (live theme colors, logo, hero banner, offers, sidebar & footer)',
        '- Admin-only source code archive downloader',
        '',
        '## Quick Start (Node.js / Render / Railway / Local)',
        '1. Copy `.env.example` to `.env` and set your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.',
        '2. Run `npm install`',
        '3. Development: `npm run dev` (runs on port 3000)',
        '4. Production: `npm run build` then `npm start`',
        '',
        '## Deploying to Netlify',
        'Do NOT drag-and-drop only the `dist/` folder (static-only hosting has no /api server).',
        'Instead, deploy the full project folder via GitHub or Netlify CLI:',
        '- `netlify.toml` and `netlify/functions/api.ts` automatically configure `/api/*` serverless endpoints.',
        '- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Netlify -> Site Configuration -> Environment Variables.',
        '',
      ].join('\n');
      collected.push({
        relPath: 'README.md',
        content: Buffer.from(readmeContent, 'utf-8'),
      });

      const crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c >>> 0;
      }

      const calcCrc32 = (buf: Buffer): number => {
        let crc = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
          crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
        }
        return (crc ^ 0xffffffff) >>> 0;
      };

      const localParts: Buffer[] = [];
      const centralParts: Buffer[] = [];
      let offset = 0;

      for (const item of collected) {
        const nameBuf = Buffer.from(item.relPath, 'utf-8');
        const crc = calcCrc32(item.content);
        const compressed = zlib.deflateRawSync(item.content);

        const localHeader = Buffer.alloc(30 + nameBuf.length);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0, 6);
        localHeader.writeUInt16LE(8, 8);
        localHeader.writeUInt16LE(0, 10);
        localHeader.writeUInt16LE(0, 12);
        localHeader.writeUInt32LE(crc, 14);
        localHeader.writeUInt32LE(compressed.length, 18);
        localHeader.writeUInt32LE(item.content.length, 22);
        localHeader.writeUInt16LE(nameBuf.length, 26);
        localHeader.writeUInt16LE(0, 28);
        nameBuf.copy(localHeader, 30);

        localParts.push(localHeader, compressed);

        const centralHeader = Buffer.alloc(46 + nameBuf.length);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0, 8);
        centralHeader.writeUInt16LE(8, 10);
        centralHeader.writeUInt16LE(0, 12);
        centralHeader.writeUInt16LE(0, 14);
        centralHeader.writeUInt32LE(crc, 16);
        centralHeader.writeUInt32LE(compressed.length, 20);
        centralHeader.writeUInt32LE(item.content.length, 24);
        centralHeader.writeUInt16LE(nameBuf.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);
        nameBuf.copy(centralHeader, 46);

        centralParts.push(centralHeader);
        offset += localHeader.length + compressed.length;
      }

      const centralBuffer = Buffer.concat(centralParts);
      const endRecord = Buffer.alloc(22);
      endRecord.writeUInt32LE(0x06054b50, 0);
      endRecord.writeUInt16LE(0, 4);
      endRecord.writeUInt16LE(0, 6);
      endRecord.writeUInt16LE(collected.length, 8);
      endRecord.writeUInt16LE(collected.length, 10);
      endRecord.writeUInt32LE(centralBuffer.length, 12);
      endRecord.writeUInt32LE(offset, 16);
      endRecord.writeUInt16LE(0, 20);

      const zipBuffer = Buffer.concat([...localParts, centralBuffer, endRecord]);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="BdHridoyShop-source.zip"');
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch {
      res.status(500).json({ error: 'Unable to package source archive.' });
    }
  });

  return app;
}

async function startServer() {
  const app = createApiApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BdHridoyShop server listening on http://localhost:${PORT}`);
  });
}

const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
if (!isServerless) {
  startServer();
}

