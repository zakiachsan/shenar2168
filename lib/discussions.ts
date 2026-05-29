import pool from './db';
import mysql from 'mysql2';

export interface Discussion {
  id: number;
  productId: number;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  status: 'pending' | 'answered';
}

function mapRow(row: any): Discussion {
  return {
    id: row.id,
    productId: row.product_id,
    question: row.question,
    askedBy: row.asked_by,
    askedAt: row.asked_at,
    answer: row.answer,
    answeredBy: row.answered_by,
    answeredAt: row.answered_at,
    status: row.status,
  };
}

export async function getDiscussions(productId?: number): Promise<Discussion[]> {
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT * FROM discussions';
    const params: any[] = [];
    if (productId !== undefined) {
      query += ' WHERE product_id = ?';
      params.push(productId);
    }
    query += ' ORDER BY asked_at DESC';
    const [rows] = await connection.execute(query, params);
    return (rows as any[]).map(mapRow);
  } finally {
    connection.release();
  }
}

export async function addDiscussion(productId: number, question: string, askedBy: string): Promise<Discussion> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO discussions (product_id, question, asked_by, asked_at, status) VALUES (?, ?, ?, NOW(), "pending")',
      [productId, question.trim(), askedBy.trim()]
    );
    const insertId = (result as mysql.ResultSetHeader).insertId;
    const [rows] = await connection.execute('SELECT * FROM discussions WHERE id = ?', [insertId]);
    return mapRow((rows as any[])[0]);
  } finally {
    connection.release();
  }
}

export async function answerDiscussion(id: number, answer: string, answeredBy: string): Promise<Discussion | null> {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'UPDATE discussions SET answer = ?, answered_by = ?, answered_at = NOW(), status = "answered" WHERE id = ?',
      [answer.trim(), answeredBy.trim(), id]
    );
    const [rows] = await connection.execute('SELECT * FROM discussions WHERE id = ?', [id]);
    const results = rows as any[];
    if (results.length === 0) return null;
    return mapRow(results[0]);
  } finally {
    connection.release();
  }
}

export async function deleteDiscussion(id: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute('DELETE FROM discussions WHERE id = ?', [id]);
    return (result as mysql.ResultSetHeader).affectedRows > 0;
  } finally {
    connection.release();
  }
}
