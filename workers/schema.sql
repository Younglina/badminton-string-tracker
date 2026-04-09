-- 羽线追踪 D1 数据库 Schema
-- 运行: wrangler d1 execute badminton-string-tracker --file=schema.sql

CREATE TABLE IF NOT EXISTS tracker_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 为 device_id 创建索引，加速查询
CREATE INDEX IF NOT EXISTS idx_device_id ON tracker_data(device_id);
