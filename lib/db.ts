import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'shenar2168',
  password: process.env.DB_PASSWORD || 'shenar2168123',
  database: process.env.DB_NAME || 'shenar2168',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Auto-migrate: ensure tables exist
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_codes (
        code VARCHAR(20) PRIMARY KEY,
        woo_order_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_woo_order_id (woo_order_id)
      )
    `);
  } catch (e) {
    console.error('DB auto-migrate error:', e);
  }
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS search_logs (
        query VARCHAR(255) PRIMARY KEY,
        search_count INT NOT NULL DEFAULT 1,
        last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.error('DB auto-migrate search_logs error:', e);
  }
})();

export default pool;
