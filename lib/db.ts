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

export default pool;
