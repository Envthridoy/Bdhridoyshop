import type { BangladeshZone, PaymentMethod } from '../types/store.ts';

export const FREE_DELIVERY_THRESHOLD_BDT = 5000;

export const DELIVERY_ZONES: Record<
  BangladeshZone,
  {
    label: string;
    feeBdt: number;
    eta: string;
    description: string;
  }
> = {
  'dhaka-metro': {
    label: 'Dhaka Metropolitan',
    feeBdt: 60,
    eta: '24 Hours (Next-Day Express)',
    description: 'Banani, Gulshan, Dhanmondi, Uttara, Mirpur, Motijheel & Metro',
  },
  'sub-dhaka': {
    label: 'Sub-Dhaka Region',
    feeBdt: 90,
    eta: '24–48 Hours',
    description: 'Gazipur, Narayanganj, Savar, Keraniganj & Tongi',
  },
  nationwide: {
    label: 'Nationwide (All 64 Districts)',
    feeBdt: 120,
    eta: '48–72 Hours via Express Courier',
    description: 'Chattogram, Sylhet, Rajshahi, Khulna, Barishal, Rangpur, Mymensingh & all districts',
  },
};

export const BANGLADESH_DIVISIONS: Array<{
  division: string;
  districts: string[];
  defaultZone: BangladeshZone;
}> = [
  {
    division: 'Dhaka',
    districts: ['Dhaka Metro', 'Gazipur', 'Narayanganj', 'Savar', 'Tangail', 'Narsingdi', 'Munshiganj'],
    defaultZone: 'dhaka-metro',
  },
  {
    division: 'Chattogram',
    districts: ['Chattogram City', "Cox's Bazar", 'Cumilla', 'Feni', 'Noakhali', 'Brahmanbaria'],
    defaultZone: 'nationwide',
  },
  {
    division: 'Sylhet',
    districts: ['Sylhet City', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
    defaultZone: 'nationwide',
  },
  {
    division: 'Rajshahi',
    districts: ['Rajshahi City', 'Bogura', 'Pabna', 'Sirajganj', 'Natore'],
    defaultZone: 'nationwide',
  },
  {
    division: 'Khulna',
    districts: ['Khulna City', 'Jashore', 'Kushtia', 'Satkhira', 'Bagerhat'],
    defaultZone: 'nationwide',
  },
  {
    division: 'Barishal',
    districts: ['Barishal City', 'Patuakhali', 'Bhola', 'Pirojpur'],
    defaultZone: 'nationwide',
  },
  {
    division: 'Rangpur',
    districts: ['Rangpur City', 'Dinajpur', 'Saidpur', 'Thakurgaon'],
    defaultZone: 'nationwide',
  },
  {
    division: 'Mymensingh',
    districts: ['Mymensingh City', 'Jamalpur', 'Netrokona', 'Sherpur'],
    defaultZone: 'nationwide',
  },
];

export function formatBDT(amount: number): string {
  const rounded = Math.round(amount);
  return `৳${rounded.toLocaleString('en-IN')}`;
}

export function inferZoneFromDistrict(division: string, district: string): BangladeshZone {
  if (division === 'Dhaka') {
    if (district === 'Dhaka Metro') return 'dhaka-metro';
    if (district === 'Gazipur' || district === 'Narayanganj' || district === 'Savar') {
      return 'sub-dhaka';
    }
  }
  return 'nationwide';
}

export function calculateDeliveryFee(subtotalAfterDiscount: number, zone: BangladeshZone): number {
  if (subtotalAfterDiscount >= FREE_DELIVERY_THRESHOLD_BDT) {
    return 0;
  }
  return DELIVERY_ZONES[zone].feeBdt;
}

export function isValidBdPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, '');
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(normalized);
}

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery (COD)';
    case 'bkash':
      return 'bKash Merchant Pay';
    case 'nagad':
      return 'Nagad Payment';
    case 'rocket':
      return 'Rocket (DBBL)';
    case 'card':
      return 'Mastercard / Visa Card';
  }
}
