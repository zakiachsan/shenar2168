import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'store-settings.json');

export interface PointsSettings {
  enabled: boolean;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  maxPoints: number;
  caption: string;
}

export interface StoreSettings {
  storeName: string;
  storeLogo: string;
  storeDescription: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsApp: string;
  storeAddress: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    faviconUrl: string;
  };
  payment: {
    midtransClientKey: string;
    midtransEnvironment: 'sandbox' | 'live';
    enableCOD: boolean;
  };
  shipping: {
    enableFreeShipping: boolean;
    freeShippingMinOrder: number;
    defaultShippingCity: string;
  };
  points: PointsSettings;
}

const defaultSettings: StoreSettings = {
  storeName: 'Shenar2168',
  storeLogo: '',
  storeDescription: 'Belanja Online Terlengkap & Terpercaya',
  contactPhone: '',
  contactEmail: '',
  contactWhatsApp: '',
  storeAddress: '',
  seo: {
    metaTitle: 'Shenar2168 - Belanja Online Terlengkap & Terpercaya',
    metaDescription:
      'Temukan berbagai produk berkualitas dengan harga terbaik. Gratis Ongkir, Voucher Cashback, dan Promo Menarik setiap hari.',
    faviconUrl: '',
  },
  payment: {
    midtransClientKey: '',
    midtransEnvironment: 'sandbox',
    enableCOD: true,
  },
  shipping: {
    enableFreeShipping: false,
    freeShippingMinOrder: 0,
    defaultShippingCity: '',
  },
  points: {
    enabled: true,
    type: 'percent',
    value: 1,
    minOrder: 0,
    maxPoints: 0,
    caption: 'Dapatkan 1% cashback dari setiap pembelian',
  },
};

export function getStoreSettings(): StoreSettings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return defaultSettings;
    }
    const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    // Merge with defaults to ensure all fields exist
    return {
      ...defaultSettings,
      ...parsed,
      seo: { ...defaultSettings.seo, ...parsed.seo },
      payment: { ...defaultSettings.payment, ...parsed.payment },
      shipping: { ...defaultSettings.shipping, ...parsed.shipping },
      points: { ...defaultSettings.points, ...parsed.points },
    };
  } catch {
    return defaultSettings;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
