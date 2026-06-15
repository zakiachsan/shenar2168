import pool from './db';

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
    enabledCouriers: string[];
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
    enabledCouriers: ["jne", "jnt", "sicepat", "anteraja", "ninja", "gojek", "grab"],
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

function mapRow(row: any): StoreSettings {
  return {
    storeName: row.store_name || defaultSettings.storeName,
    storeLogo: row.store_logo || '',
    storeDescription: row.store_description || defaultSettings.storeDescription,
    contactPhone: row.contact_phone || '',
    contactEmail: row.contact_email || '',
    contactWhatsApp: row.contact_whatsapp || '',
    storeAddress: row.store_address || '',
    seo: {
      metaTitle: row.seo_meta_title || defaultSettings.seo.metaTitle,
      metaDescription: row.seo_meta_description || defaultSettings.seo.metaDescription,
      faviconUrl: row.seo_favicon_url || '',
    },
    payment: {
      midtransClientKey: row.payment_midtrans_client_key || '',
      midtransEnvironment: row.payment_midtrans_environment || 'sandbox',
      enableCOD: Boolean(row.payment_enable_cod),
    },
    shipping: {
      enableFreeShipping: Boolean(row.shipping_enable_free_shipping),
      freeShippingMinOrder: row.shipping_free_shipping_min_order || 0,
      defaultShippingCity: row.shipping_default_city || '',
      enabledCouriers: row.shipping_enabled_couriers ? JSON.parse(row.shipping_enabled_couriers) : ['jne', 'jnt', 'sicepat', 'anteraja', 'ninja', 'gojek', 'grab'],
    },
    points: {
      enabled: Boolean(row.points_enabled),
      type: row.points_type || 'percent',
      value: row.points_value || 1,
      minOrder: row.points_min_order || 0,
      maxPoints: row.points_max_points || 0,
      caption: row.points_caption || defaultSettings.points.caption,
    },
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM store_settings WHERE id = 1');
    const results = rows as any[];
    if (results.length === 0) return defaultSettings;
    return mapRow(results[0]);
  } finally {
    connection.release();
  }
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `INSERT INTO store_settings (id, store_name, store_logo, store_description, contact_phone, contact_email, contact_whatsapp, store_address,
        seo_meta_title, seo_meta_description, seo_favicon_url,
        payment_midtrans_client_key, payment_midtrans_environment, payment_enable_cod,
        shipping_enable_free_shipping, shipping_free_shipping_min_order, shipping_default_city, shipping_enabled_couriers,
        points_enabled, points_type, points_value, points_min_order, points_max_points, points_caption)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        store_name = VALUES(store_name), store_logo = VALUES(store_logo), store_description = VALUES(store_description),
        contact_phone = VALUES(contact_phone), contact_email = VALUES(contact_email), contact_whatsapp = VALUES(contact_whatsapp),
        store_address = VALUES(store_address), seo_meta_title = VALUES(seo_meta_title), seo_meta_description = VALUES(seo_meta_description),
        seo_favicon_url = VALUES(seo_favicon_url), payment_midtrans_client_key = VALUES(payment_midtrans_client_key),
        payment_midtrans_environment = VALUES(payment_midtrans_environment), payment_enable_cod = VALUES(payment_enable_cod),
        shipping_enable_free_shipping = VALUES(shipping_enable_free_shipping), shipping_free_shipping_min_order = VALUES(shipping_free_shipping_min_order),
        shipping_default_city = VALUES(shipping_default_city), shipping_enabled_couriers = VALUES(shipping_enabled_couriers), points_enabled = VALUES(points_enabled), points_type = VALUES(points_type),
        points_value = VALUES(points_value), points_min_order = VALUES(points_min_order), points_max_points = VALUES(points_max_points),
        points_caption = VALUES(points_caption)`,
      [
        settings.storeName,
        settings.storeLogo,
        settings.storeDescription,
        settings.contactPhone,
        settings.contactEmail,
        settings.contactWhatsApp,
        settings.storeAddress,
        settings.seo.metaTitle,
        settings.seo.metaDescription,
        settings.seo.faviconUrl,
        settings.payment.midtransClientKey,
        settings.payment.midtransEnvironment,
        settings.payment.enableCOD ? 1 : 0,
        settings.shipping.enableFreeShipping ? 1 : 0,
        settings.shipping.freeShippingMinOrder,
        settings.shipping.defaultShippingCity,
        JSON.stringify(settings.shipping.enabledCouriers),
        settings.points.enabled ? 1 : 0,
        settings.points.type,
        settings.points.value,
        settings.points.minOrder,
        settings.points.maxPoints,
        settings.points.caption,
      ]
    );
  } finally {
    connection.release();
  }
}
