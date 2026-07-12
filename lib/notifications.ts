/**
 * Notification Helper
 * - Admin notifications: user_id = NULL (seller sees these)
 * - Customer notifications: user_id = phone (customer sees these)
 */
import pool from './db';

type NotificationType = 'order' | 'review' | 'stock' | 'promo' | 'system';

/**
 * Create a notification.
 * @param user_id  NULL = admin-only, phone string = customer-specific
 */
export async function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  user_id?: string | null
): Promise<void> {
  try {
    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [user_id ?? null, type, title, message, link || null]
    );
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

// ─── Admin-only notifications (user_id = NULL) ───────────────────────────────

export async function notifyNewOrder(orderId: number, total: string, itemCount: number): Promise<void> {
  await createNotification(
    'order',
    'Pesanan Baru',
    `Pesanan #${orderId} dari ${itemCount} produk senilai Rp ${parseInt(total).toLocaleString('id-ID')} menunggu diproses.`,
    `/admin/orders?id=${orderId}`,
    null // admin only
  );
}

export async function notifyNewReview(productId: number, productName: string, rating: number): Promise<void> {
  await createNotification(
    'review',
    'Review Baru',
    `Produk "${productName}" mendapat review ${rating} bintang.`,
    `/admin/products?id=${productId}`,
    null
  );
}

export async function notifyLowStock(productName: string, stock: number): Promise<void> {
  await createNotification(
    'stock',
    'Stok Menipis',
    `Produk "${productName}" tersisa ${stock} unit.`,
    `/admin/products?search=${encodeURIComponent(productName)}`,
    null
  );
}

export async function notifyOutOfStock(productName: string): Promise<void> {
  await createNotification(
    'stock',
    'Stok Habis',
    `Produk "${productName}" sudah habis.`,
    `/admin/products?search=${encodeURIComponent(productName)}`,
    null
  );
}

export async function notifyNewCoupon(code: string, discountType: string, amount: string): Promise<void> {
  const label = discountType === 'percent' ? `${amount}%` : `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
  await createNotification(
    'promo',
    'Voucher Dibuat',
    `Voucher "${code}" dengan diskon ${label} telah dibuat.`,
    `/admin/coupons`,
    null
  );
}

// ─── Customer notifications (user_id = phone) ────────────────────────────────

/**
 * Notify customer when their order status changes.
 * Called from admin order update — we look up the customer phone from WC order.
 */
export async function notifyCustomerOrderStatus(
  orderId: number,
  status: string,
  customerPhone: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    pending: 'menunggu pembayaran',
    processing: 'sedang diproses',
    shipped: 'sudah dikirim',
    'on-hold': 'ditahan sementara',
    completed: 'telah selesai',
    cancelled: 'dibatalkan',
    refunded: 'telah direfund',
    failed: 'gagal',
  };
  const label = statusLabels[status] || status;
  await createNotification(
    'order',
    'Status Pesanan Diperbarui',
    `Pesanan #${orderId} ${label}.`,
    `/profile/orders`,
    customerPhone
  );
}

/**
 * Notify customer about a promo / global system message.
 */
export async function notifyCustomerPromo(
  title: string,
  message: string,
  customerPhone: string,
  link?: string
): Promise<void> {
  await createNotification('promo', title, message, link ?? '/shop', customerPhone);
}

/**
 * Notify all customers about a new promo (broadcast).
 * Creates one notification per customer phone.
 */
export async function broadcastPromo(
  title: string,
  message: string,
  customerPhones: string[],
  link?: string
): Promise<void> {
  for (const phone of customerPhones) {
    await createNotification('promo', title, message, link ?? '/shop', phone);
  }
}

// ─── Legacy alias (backward compat) ──────────────────────────────────────────

/** @deprecated Use notifyCustomerOrderStatus for customer, keep for admin-only */
export async function notifyOrderStatus(orderId: number, status: string): Promise<void> {
  const statusLabels: Record<string, string> = {
    processing: 'sedang diproses',
    completed: 'telah selesai',
    cancelled: 'dibatalkan',
    refunded: 'direfund',
  };
  await createNotification(
    'order',
    'Status Pesanan Diperbarui',
    `Pesanan #${orderId} ${statusLabels[status] || status}.`,
    `/admin/orders?id=${orderId}`,
    null
  );
}

// ─── System (admin-only) ─────────────────────────────────────────────────────

export async function notifySystem(title: string, message: string, link?: string): Promise<void> {
  await createNotification('system', title, message, link, null);
}
