import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, name, fullAddress, postalCode, note } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      // Check if customer exists by phone
      const [rows] = await conn.execute('SELECT id FROM customers WHERE phone = ?', [phone]);
      const existing = (rows as any[])[0];

      const nameParts = (name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (existing) {
        await conn.execute(
          'UPDATE customers SET first_name = ?, last_name = ?, address = ?, postal_code = ?, note = ? WHERE phone = ?',
          [firstName, lastName, fullAddress || '', postalCode || null, note || null, phone]
        );
      } else {
        await conn.execute(
          'INSERT INTO customers (phone, first_name, last_name, address, postal_code, note) VALUES (?, ?, ?, ?, ?, ?)',
          [phone, firstName, lastName, fullAddress || '', postalCode || null, note || null]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.error('Save address error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT first_name, last_name, address, postal_code, note FROM customers WHERE phone = ?',
        [phone]
      );
      const results = rows as any[];
      if (results.length === 0) {
        return NextResponse.json({ address: null });
      }

      const row = results[0];
      return NextResponse.json({
        address: {
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
          fullAddress: row.address || '',
          postalCode: row.postal_code || '',
          note: row.note || '',
        },
      });
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.error('Get address error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
