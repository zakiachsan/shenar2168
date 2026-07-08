import pool from './db';
import mysql from 'mysql2';

// --- Types ---

export interface ReturnItem {
  id?: number;
  returnId?: number;
  orderItemId?: number | null;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface Return {
  id: number;
  orderId: number;
  customerId: number | null;
  reason: string;
  unboxingVideoUrl: string | null;
  returnTrackingNumber: string | null;
  returnCourier: string | null;
  refundAmount: number;
  status: 'requested' | 'shipped' | 'received' | 'completed' | 'rejected';
  adminNotes: string | null;
  items: ReturnItem[];
  createdAt: string;
  updatedAt: string;
}

// --- Helpers ---

function mapReturnRow(row: any): Return {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    reason: row.reason || '',
    unboxingVideoUrl: row.unboxing_video_url || null,
    returnTrackingNumber: row.return_tracking_number || null,
    returnCourier: row.return_courier || null,
    refundAmount: Number(row.refund_amount) || 0,
    status: row.status,
    adminNotes: row.admin_notes || null,
    items: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReturnItemRow(row: any): ReturnItem {
  return {
    id: row.id,
    returnId: row.return_id,
    orderItemId: row.order_item_id || null,
    productId: row.product_id,
    productName: row.product_name || '',
    quantity: row.quantity,
    price: Number(row.price) || 0,
  };
}

async function loadReturnItems(conn: mysql.PoolConnection, returnId: number): Promise<ReturnItem[]> {
  const [rows] = await conn.execute(
    'SELECT * FROM return_items WHERE return_id = ?',
    [returnId]
  );
  return (rows as any[]).map(mapReturnItemRow);
}

// --- Order status mapping ---

const RETURN_STATUS_TO_ORDER_STATUS: Record<string, string> = {
  requested: 'return_requested',
  shipped: 'return_shipped',
  received: 'return_received',
  completed: 'return_completed',
  rejected: 'completed', // revert to completed if rejected
};

// --- CRUD ---

/** Create a new return request. Also updates order status to return_requested. */
export async function createReturn(data: {
  orderId: number;
  customerId?: number | null;
  reason: string;
  unboxingVideoUrl?: string;
  items: { orderItemId?: number | null; productId: number; productName: string; quantity: number; price: number }[];
}): Promise<Return> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert return record
    const [result] = await conn.execute(
      `INSERT INTO returns (order_id, customer_id, reason, unboxing_video_url, status)
       VALUES (?, ?, ?, ?, 'requested')`,
      [data.orderId, data.customerId || null, data.reason, data.unboxingVideoUrl || null]
    );
    const returnId = (result as mysql.ResultSetHeader).insertId;

    // Insert return items
    for (const item of data.items) {
      await conn.execute(
        `INSERT INTO return_items (return_id, order_item_id, product_id, product_name, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [returnId, item.orderItemId || null, item.productId, item.productName, item.quantity, item.price]
      );
    }

    // Update order status
    await conn.execute(
      `UPDATE orders SET status = 'return_requested' WHERE id = ?`,
      [data.orderId]
    );

    await conn.commit();
    return (await getReturnById(returnId))!;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Get return by ID (with items). */
export async function getReturnById(id: number): Promise<Return | null> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM returns WHERE id = ?', [id]);
    const results = rows as any[];
    if (results.length === 0) return null;

    const ret = mapReturnRow(results[0]);
    ret.items = await loadReturnItems(conn, ret.id);
    return ret;
  } finally {
    conn.release();
  }
}

/** Get return by order ID. */
export async function getReturnByOrderId(orderId: number): Promise<Return | null> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT * FROM returns WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    const results = rows as any[];
    if (results.length === 0) return null;

    const ret = mapReturnRow(results[0]);
    ret.items = await loadReturnItems(conn, ret.id);
    return ret;
  } finally {
    conn.release();
  }
}

/** Update return status. Syncs the corresponding order status. */
export async function updateReturnStatus(
  id: number,
  status: Return['status'],
  updates?: {
    refundAmount?: number;
    adminNotes?: string;
    returnTrackingNumber?: string;
    returnCourier?: string;
  }
): Promise<Return | null> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fields: string[] = ['status = ?'];
    const values: any[] = [status];

    if (updates?.refundAmount !== undefined) {
      fields.push('refund_amount = ?');
      values.push(updates.refundAmount);
    }
    if (updates?.adminNotes !== undefined) {
      fields.push('admin_notes = ?');
      values.push(updates.adminNotes);
    }
    if (updates?.returnTrackingNumber !== undefined) {
      fields.push('return_tracking_number = ?');
      values.push(updates.returnTrackingNumber);
    }
    if (updates?.returnCourier !== undefined) {
      fields.push('return_courier = ?');
      values.push(updates.returnCourier);
    }

    values.push(id);
    await conn.execute(`UPDATE returns SET ${fields.join(', ')} WHERE id = ?`, values);

    // Sync order status
    const orderStatus = RETURN_STATUS_TO_ORDER_STATUS[status];
    if (orderStatus) {
      // Get the return to find its order_id
      const [retRows] = await conn.execute('SELECT order_id FROM returns WHERE id = ?', [id]);
      const orderId = (retRows as any[])[0]?.order_id;
      if (orderId) {
        await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [orderStatus, orderId]);
      }
    }

    await conn.commit();
    return await getReturnById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Get returns list (for admin). */
export async function getReturns(options: {
  page?: number;
  per_page?: number;
  status?: string;
} = {}): Promise<{ returns: Return[]; total: number }> {
  const conn = await pool.getConnection();
  try {
    const limit = options.per_page || 20;
    const offset = ((options.page || 1) - 1) * limit;
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (options.status) {
      conditions.push('r.status = ?');
      params.push(options.status);
    }

    const where = conditions.join(' AND ');

    const [countRows] = await conn.execute(
      `SELECT COUNT(*) as total FROM returns r WHERE ${where}`,
      params
    );
    const total = (countRows as any[])[0].total;

    const [rows] = await conn.query(
      `SELECT r.* FROM returns r WHERE ${where} ORDER BY r.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params
    );

    const returns = (rows as any[]).map(mapReturnRow);
    for (const ret of returns) {
      ret.items = await loadReturnItems(conn, ret.id);
    }

    return { returns, total };
  } finally {
    conn.release();
  }
}
