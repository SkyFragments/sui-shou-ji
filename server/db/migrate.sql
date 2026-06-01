-- ============================================================
-- Migration: 旧 schema (id 单列 PK) → (openid, id) 复合 PK
-- 仅在升级已部署的实例时运行，新部署不需要
-- 用法: mysql -u root -p suishouji < migrate.sql
-- ============================================================

USE suishouji;

-- users: 扩展 token 列
ALTER TABLE users MODIFY COLUMN token VARCHAR(512);

-- categories: 增 update_time/create_time + 改 PK
ALTER TABLE categories
  ADD COLUMN create_time BIGINT NOT NULL DEFAULT 0 AFTER is_default,
  ADD COLUMN update_time BIGINT NOT NULL DEFAULT 0 AFTER create_time,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (openid, id);

-- records / accounts / budgets: 必须重建表（MySQL 不支持直接改 PK 包含已有数据的列）
-- 用 stored procedure 做"存在才迁移"，避免重复执行报错

DROP PROCEDURE IF EXISTS migrate_rebuild;
DELIMITER //
CREATE PROCEDURE migrate_rebuild()
BEGIN
  -- records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'suishouji' AND table_name = 'records') THEN
    -- 检查是否已经是复合 PK
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage
      WHERE table_schema = 'suishouji' AND table_name = 'records'
        AND constraint_name = 'PRIMARY'
    ) OR (
      SELECT COUNT(*) FROM information_schema.key_column_usage
      WHERE table_schema = 'suishouji' AND table_name = 'records' AND constraint_name = 'PRIMARY'
    ) = 1 THEN
      RENAME TABLE records TO _records_old;
      CREATE TABLE records (
        id VARCHAR(32) NOT NULL,
        openid VARCHAR(64) NOT NULL,
        type INT NOT NULL,
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      INSERT INTO records SELECT * FROM _records_old;
      DROP TABLE _records_old;
    END IF;
  END IF;

  -- accounts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'suishouji' AND table_name = 'accounts') THEN
    IF (SELECT COUNT(*) FROM information_schema.key_column_usage
        WHERE table_schema = 'suishouji' AND table_name = 'accounts' AND constraint_name = 'PRIMARY') = 1 THEN
      RENAME TABLE accounts TO _accounts_old;
      CREATE TABLE accounts (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      INSERT INTO accounts SELECT * FROM _accounts_old;
      DROP TABLE _accounts_old;
    END IF;
  END IF;

  -- budgets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'suishouji' AND table_name = 'budgets') THEN
    IF (SELECT COUNT(*) FROM information_schema.key_column_usage
        WHERE table_schema = 'suishouji' AND table_name = 'budgets' AND constraint_name = 'PRIMARY') = 1 THEN
      RENAME TABLE budgets TO _budgets_old;
      CREATE TABLE budgets (
        id VARCHAR(32) NOT NULL,
        openid VARCHAR(64) NOT NULL,
        year_month VARCHAR(7) NOT NULL,
        total_budget DECIMAL(10,2) NOT NULL,
        create_time BIGINT,
        update_time BIGINT,
        PRIMARY KEY (openid, id),
        UNIQUE INDEX idx_openid_month (openid, year_month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      INSERT INTO budgets SELECT * FROM _budgets_old;
      DROP TABLE _budgets_old;
    END IF;
  END IF;
END //
DELIMITER ;

CALL migrate_rebuild();
DROP PROCEDURE migrate_rebuild;
