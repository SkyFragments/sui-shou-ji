CREATE DATABASE IF NOT EXISTS suishouji DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE suishouji;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(64) UNIQUE NOT NULL,
  token VARCHAR(256),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Composite (openid, id) PK on every business table so MySQL itself enforces
-- tenant isolation on upsert conflict. Without this, ON DUPLICATE KEY UPDATE
-- keyed on id alone would let any user's POST overwrite another user's row.

CREATE TABLE IF NOT EXISTS records (
  id VARCHAR(32) NOT NULL,
  openid VARCHAR(64) NOT NULL,
  type INT NOT NULL COMMENT '1=支出 2=收入',
  amount DECIMAL(10,2) NOT NULL,
  category_code VARCHAR(16) NOT NULL,
  category_name VARCHAR(32),
  account_code VARCHAR(16) NOT NULL,
  remark TEXT,
  record_date DATE NOT NULL,
  create_time BIGINT NOT NULL,
  update_time BIGINT NOT NULL,
  sync_status INT DEFAULT 0,
  PRIMARY KEY (openid, id),
  INDEX idx_openid (openid),
  INDEX idx_record_date (record_date),
  INDEX idx_update_time (update_time)
);

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(32) NOT NULL,
  openid VARCHAR(64) NOT NULL,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(32) NOT NULL,
  icon VARCHAR(8),
  color VARCHAR(16),
  type INT NOT NULL COMMENT '1=支出 2=收入',
  sort INT DEFAULT 0,
  is_default INT DEFAULT 0,
  PRIMARY KEY (openid, id),
  UNIQUE INDEX idx_openid_code (openid, code)
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(32) NOT NULL,
  openid VARCHAR(64) NOT NULL,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(32) NOT NULL,
  type VARCHAR(16),
  balance DECIMAL(10,2) DEFAULT 0,
  sort INT DEFAULT 0,
  is_default INT DEFAULT 0,
  create_time BIGINT,
  update_time BIGINT,
  PRIMARY KEY (openid, id),
  UNIQUE INDEX idx_openid_code (openid, code)
);

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(32) NOT NULL,
  openid VARCHAR(64) NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  total_budget DECIMAL(10,2) NOT NULL,
  create_time BIGINT,
  update_time BIGINT,
  PRIMARY KEY (openid, id),
  UNIQUE INDEX idx_openid_month (openid, year_month)
);