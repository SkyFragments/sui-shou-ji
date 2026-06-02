-- ============================================================
-- Migration: 旧 schema (id 单列 PK) → (openid, id) 复合 PK
-- 仅在升级已部署的实例时运行，新部署不需要
-- 用法: mysql -u root -p suishouji < migrate.sql
--
-- 全部走 stored procedure + IF NOT EXISTS 守卫，可重复执行
-- ============================================================

USE suishouji;

-- users: 扩展 token 列（VARCHAR 改长幂等）
ALTER TABLE users MODIFY COLUMN token VARCHAR(512);

-- 所有表迁移：先判断是否已是复合 PK（key_column_usage 计数 = 2 表示 (openid,id)）
-- 仍为单列 PK 才进入重建分支
DROP PROCEDURE IF EXISTS migrate_rebuild;
DELIMITER //
CREATE PROCEDURE migrate_rebuild()
BEGIN
  DECLARE pk_count INT;

  -- categories: 增 create_time/update_time + 改 PK
  SELECT COUNT(*) INTO pk_count FROM information_schema.key_column_usage
    WHERE table_schema = 'suishouji' AND table_name = 'categories' AND constraint_name = 'PRIMARY';
  IF pk_count = 1 THEN
    SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
      WHERE table_schema = 'suishouji' AND table_name = 'categories' AND column_name = 'create_time');
    IF @col_exists = 0 THEN
      ALTER TABLE categories
        ADD COLUMN create_time BIGINT NOT NULL DEFAULT 0 AFTER is_default,
        ADD COLUMN update_time BIGINT NOT NULL DEFAULT 0 AFTER create_time;
    END IF;
    ALTER TABLE categories DROP PRIMARY KEY, ADD PRIMARY KEY (openid, id);
  END IF;

  -- records: 必须重建表（不能 ALTER PK 含数据的列）
  SELECT COUNT(*) INTO pk_count FROM information_schema.key_column_usage
    WHERE table_schema = 'suishouji' AND table_name = 'records' AND constraint_name = 'PRIMARY';
  IF pk_count = 1 THEN
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
    -- 关键：放宽 sql_mode 允许旧的 NULL/空数据塞进新表；后续可在应用层清理
    SET SESSION sql_mode = '';
    INSERT INTO records (id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status)
      SELECT
        COALESCE(id, ''),
        COALESCE(openid, ''),
        COALESCE(type, 1),
        COALESCE(amount, 0),
        COALESCE(category_code, ''),
        category_name,
        COALESCE(account_code, ''),
        remark,
        COALESCE(record_date, '1970-01-01'),
        COALESCE(create_time, 0),
        COALESCE(update_time, 0),
        COALESCE(sync_status, 0)
      FROM _records_old
      WHERE id IS NOT NULL AND id <> '' AND openid IS NOT NULL AND openid <> '';
    DROP TABLE _records_old;
  END IF;

  -- accounts
  SELECT COUNT(*) INTO pk_count FROM information_schema.key_column_usage
    WHERE table_schema = 'suishouji' AND table_name = 'accounts' AND constraint_name = 'PRIMARY';
  IF pk_count = 1 THEN
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
    INSERT INTO accounts
      SELECT id, openid, code, name, type, balance, sort, is_default, create_time, update_time
      FROM _accounts_old
      WHERE id IS NOT NULL AND id <> '' AND openid IS NOT NULL AND openid <> '';
    DROP TABLE _accounts_old;
  END IF;

  -- budgets
  SELECT COUNT(*) INTO pk_count FROM information_schema.key_column_usage
    WHERE table_schema = 'suishouji' AND table_name = 'budgets' AND constraint_name = 'PRIMARY';
  IF pk_count = 1 THEN
    RENAME TABLE budgets TO _budgets_old;
    CREATE TABLE budgets (
      id VARCHAR(32) NOT NULL,
      openid VARCHAR(64) NOT NULL,
      `year_month` VARCHAR(7) NOT NULL,
      total_budget DECIMAL(10,2) NOT NULL,
      create_time BIGINT,
      update_time BIGINT,
      PRIMARY KEY (openid, id),
      UNIQUE INDEX idx_openid_month (openid, `year_month`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    INSERT INTO budgets
      SELECT id, openid, `year_month`, total_budget, create_time, update_time
      FROM _budgets_old
      WHERE id IS NOT NULL AND id <> '' AND openid IS NOT NULL AND openid <> '';
    DROP TABLE _budgets_old;
  END IF;
END //
DELIMITER ;

CALL migrate_rebuild();
DROP PROCEDURE migrate_rebuild;
