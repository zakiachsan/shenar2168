import pool from './db';
import { randomUUID } from 'crypto';

export interface CoinTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  description: string;
  date: string;
  orderId?: string;
}

export interface UserCoins {
  balance: number;
  transactions: CoinTransaction[];
}

function mapTransaction(row: any): CoinTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    date: row.date,
    orderId: row.order_id,
  };
}

export async function getUserCoins(phone: string): Promise<UserCoins> {
  const connection = await pool.getConnection();
  try {
    const [userRows] = await connection.execute('SELECT * FROM user_coins WHERE phone = ?', [phone]);
    const users = userRows as any[];
    const balance = users.length > 0 ? users[0].balance : 0;

    const [txRows] = await connection.execute(
      'SELECT * FROM coin_transactions WHERE phone = ? ORDER BY date DESC',
      [phone]
    );
    return {
      balance,
      transactions: (txRows as any[]).map(mapTransaction),
    };
  } finally {
    connection.release();
  }
}

export async function earnCoins(
  phone: string,
  amount: number,
  description: string,
  orderId?: string
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO user_coins (phone, balance) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
      [phone, amount]
    );

    await connection.execute(
      'INSERT INTO coin_transactions (id, phone, type, amount, description, date, order_id) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
      [randomUUID(), phone, 'earn', amount, description, orderId || null]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function spendCoins(
  phone: string,
  amount: number,
  description: string
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO user_coins (phone, balance) VALUES (?, 0)
       ON DUPLICATE KEY UPDATE balance = GREATEST(0, balance - ?)`,
      [phone, amount]
    );

    await connection.execute(
      'INSERT INTO coin_transactions (id, phone, type, amount, description, date, order_id) VALUES (?, ?, ?, ?, ?, NOW(), NULL)',
      [randomUUID(), phone, 'spend', amount, description]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
