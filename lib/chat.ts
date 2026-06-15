import pool from './db';
import mysql from 'mysql2';

export interface ChatThread {
  id: number;
  userId: number | null;
  userName: string;
  userPhone: string | null;
  productId: number | null;
  productName: string | null;
  status: 'open' | 'closed';
  adminRead: boolean;
  userRead: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  threadId: number;
  senderType: 'user' | 'admin';
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function mapThread(row: any): ChatThread {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    productId: row.product_id,
    productName: row.product_name,
    status: row.status,
    adminRead: !!row.admin_read,
    userRead: !!row.user_read,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderType: row.sender_type,
    senderName: row.sender_name,
    message: row.message,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

// Find existing thread for a user+product combo (or general chat if no product)
export async function findThread(userId: number, productId?: number | null): Promise<ChatThread | null> {
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT * FROM chat_threads WHERE user_id = ?';
    const params: any[] = [userId];
    if (productId) {
      query += ' AND product_id = ?';
      params.push(productId);
    } else {
      query += ' AND product_id IS NULL';
    }
    query += ' ORDER BY created_at DESC LIMIT 1';
    const [rows] = await connection.execute(query, params);
    const results = rows as any[];
    return results.length > 0 ? mapThread(results[0]) : null;
  } finally {
    connection.release();
  }
}

// Create a new thread
export async function createThread(data: {
  userId: number;
  userName: string;
  userPhone?: string;
  productId?: number;
  productName?: string;
}): Promise<ChatThread> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO chat_threads (user_id, user_name, user_phone, product_id, product_name, status, admin_read, user_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', 0, 1, NOW(), NOW())`,
      [data.userId, data.userName, data.userPhone || null, data.productId || null, data.productName || null]
    );
    const insertId = (result as mysql.ResultSetHeader).insertId;
    const [rows] = await connection.execute('SELECT * FROM chat_threads WHERE id = ?', [insertId]);
    return mapThread((rows as any[])[0]);
  } finally {
    connection.release();
  }
}

// Get or create thread
export async function getOrCreateThread(data: {
  userId: number;
  userName: string;
  userPhone?: string;
  productId?: number;
  productName?: string;
}): Promise<ChatThread> {
  const existing = await findThread(data.userId, data.productId);
  if (existing) return existing;
  return createThread(data);
}

// Send a message
export async function sendMessage(data: {
  threadId: number;
  senderType: 'user' | 'admin';
  senderName: string;
  message: string;
}): Promise<ChatMessage> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO chat_messages (thread_id, sender_type, sender_name, message, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
      [data.threadId, data.senderType, data.senderName, data.message.trim()]
    );
    const insertId = (result as mysql.ResultSetHeader).insertId;

    // Update thread
    const markAdminRead = data.senderType === 'admin' ? 1 : 0;
    const markUserRead = data.senderType === 'user' ? 1 : 0;
    await connection.execute(
      `UPDATE chat_threads SET last_message = ?, last_message_at = NOW(), admin_read = ?, user_read = ?, updated_at = NOW() WHERE id = ?`,
      [data.message.trim().substring(0, 255), markAdminRead, markUserRead, data.threadId]
    );

    const [rows] = await connection.execute('SELECT * FROM chat_messages WHERE id = ?', [insertId]);
    return mapMessage((rows as any[])[0]);
  } finally {
    connection.release();
  }
}

// Get messages for a thread
export async function getMessages(threadId: number, limit = 50, before?: number): Promise<ChatMessage[]> {
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT * FROM chat_messages WHERE thread_id = ?';
    const params: any[] = [threadId];
    if (before) {
      query += ' AND id < ?';
      params.push(before);
    }
    query += ` ORDER BY created_at ASC LIMIT ${Number(limit)}`;
    const [rows] = await connection.execute(query, params);
    return (rows as any[]).map(mapMessage);
  } finally {
    connection.release();
  }
}

// Get threads for admin (with unread count)
export async function getAdminThreads(filters?: {
  status?: 'open' | 'closed';
  unreadOnly?: boolean;
}): Promise<(ChatThread & { unreadCount: number })[]> {
  const connection = await pool.getConnection();
  try {
    let query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.thread_id = t.id AND m.sender_type = 'user' AND m.is_read = 0) as unread_count
      FROM chat_threads t
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.status) {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters?.unreadOnly) {
      conditions.push('(SELECT COUNT(*) FROM chat_messages m WHERE m.thread_id = t.id AND m.sender_type = \'user\' AND m.is_read = 0) > 0');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY t.last_message_at DESC, t.created_at DESC';

    const [rows] = await connection.execute(query, params);
    return (rows as any[]).map((r) => ({
      ...mapThread(r),
      unreadCount: r.unread_count || 0,
    }));
  } finally {
    connection.release();
  }
}

// Get threads for a user
export async function getUserThreads(userId: number): Promise<(ChatThread & { unreadCount: number })[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT t.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.thread_id = t.id AND m.sender_type = 'admin' AND m.is_read = 0) as unread_count
       FROM chat_threads t
       WHERE t.user_id = ?
       ORDER BY t.last_message_at DESC, t.created_at DESC`,
      [userId]
    );
    return (rows as any[]).map((r) => ({
      ...mapThread(r),
      unreadCount: r.unread_count || 0,
    }));
  } finally {
    connection.release();
  }
}

// Mark messages as read
export async function markAsRead(threadId: number, senderType: 'user' | 'admin'): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'UPDATE chat_messages SET is_read = 1 WHERE thread_id = ? AND sender_type = ? AND is_read = 0',
      [threadId, senderType]
    );
    // Also update thread read flag
    if (senderType === 'admin') {
      await connection.execute('UPDATE chat_threads SET admin_read = 1 WHERE id = ?', [threadId]);
    } else {
      await connection.execute('UPDATE chat_threads SET user_read = 1 WHERE id = ?', [threadId]);
    }
  } finally {
    connection.release();
  }
}

// Close/open thread
export async function updateThreadStatus(threadId: number, status: 'open' | 'closed'): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.execute('UPDATE chat_threads SET status = ?, updated_at = NOW() WHERE id = ?', [status, threadId]);
  } finally {
    connection.release();
  }
}

// Get thread by ID
export async function getThreadById(threadId: number): Promise<ChatThread | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM chat_threads WHERE id = ?', [threadId]);
    const results = rows as any[];
    return results.length > 0 ? mapThread(results[0]) : null;
  } finally {
    connection.release();
  }
}

// Delete thread
export async function deleteThread(threadId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute('DELETE FROM chat_threads WHERE id = ?', [threadId]);
    return (result as mysql.ResultSetHeader).affectedRows > 0;
  } finally {
    connection.release();
  }
}
