CREATE TABLE IF NOT EXISTS store_settings (
  id INT PRIMARY KEY DEFAULT 1,
  store_name VARCHAR(255) DEFAULT 'RagamGuna',
  store_logo TEXT,
  store_description TEXT,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  contact_whatsapp VARCHAR(50),
  store_address TEXT,
  seo_meta_title VARCHAR(255),
  seo_meta_description TEXT,
  seo_favicon_url TEXT,
  payment_midtrans_client_key VARCHAR(255),
  payment_midtrans_environment ENUM('sandbox', 'live') DEFAULT 'sandbox',
  payment_enable_cod BOOLEAN DEFAULT TRUE,
  shipping_enable_free_shipping BOOLEAN DEFAULT FALSE,
  shipping_free_shipping_min_order INT DEFAULT 0,
  shipping_default_city VARCHAR(100),
  points_enabled BOOLEAN DEFAULT TRUE,
  points_type ENUM('percent', 'fixed') DEFAULT 'percent',
  points_value INT DEFAULT 1,
  points_min_order INT DEFAULT 0,
  points_max_points INT DEFAULT 0,
  points_caption VARCHAR(255) DEFAULT 'Dapatkan 1% cashback dari setiap pembelian',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etalase_sections (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  banner_image TEXT,
  banner_link TEXT,
  icon VARCHAR(50) DEFAULT 'LayoutGrid',
  is_flash_sale BOOLEAN DEFAULT FALSE,
  flash_sale_end_time TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etalase_products (
  section_id VARCHAR(100) NOT NULL,
  product_id INT NOT NULL,
  flash_sale_stock INT DEFAULT NULL,
  flash_sale_sold INT DEFAULT NULL,
  PRIMARY KEY (section_id, product_id),
  FOREIGN KEY (section_id) REFERENCES etalase_sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discussions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  question TEXT NOT NULL,
  asked_by VARCHAR(255) NOT NULL,
  asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answer TEXT,
  answered_by VARCHAR(255),
  answered_at TIMESTAMP NULL,
  status ENUM('pending', 'answered') DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS user_coins (
  phone VARCHAR(50) PRIMARY KEY,
  balance INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(50) NOT NULL,
  type ENUM('earn', 'spend') NOT NULL,
  amount INT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_id VARCHAR(100),
  FOREIGN KEY (phone) REFERENCES user_coins(phone) ON DELETE CASCADE
);

-- Insert default store settings
INSERT INTO store_settings (id) VALUES (1)
ON DUPLICATE KEY UPDATE id = id;

-- Insert default etalase sections
INSERT INTO etalase_sections (id, title, type, enabled, sort_order, icon, is_flash_sale, flash_sale_end_time)
VALUES
  ('flash-sale', 'Flash Sale', 'flash_sale', TRUE, 1, 'Zap', TRUE, DATE_ADD(NOW(), INTERVAL 2 HOUR)),
  ('discount', 'Dengan Diskon', 'discount', TRUE, 2, 'Tag', FALSE, NULL),
  ('best-sellers', 'Produk Terlaris', 'best_sellers', TRUE, 3, 'TrendingUp', FALSE, NULL)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO etalase_products (section_id, product_id, flash_sale_stock, flash_sale_sold) VALUES
  ('flash-sale', 1, 100, 50),
  ('flash-sale', 2, 80, 40),
  ('flash-sale', 3, 120, 72),
  ('flash-sale', 4, 60, 30),
  ('discount', 102, NULL, NULL),
  ('discount', 103, NULL, NULL),
  ('discount', 104, NULL, NULL),
  ('discount', 105, NULL, NULL),
  ('best-sellers', 101, NULL, NULL),
  ('best-sellers', 106, NULL, NULL),
  ('best-sellers', 107, NULL, NULL),
  ('best-sellers', 108, NULL, NULL)
ON DUPLICATE KEY UPDATE section_id = section_id;
