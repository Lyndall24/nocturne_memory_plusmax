-- 004_add_expectation_table.sql
-- Expectation table stores session-level memory loading preferences.
-- intensity/dependency/expression each range 0-2.
-- Note: init_db() uses SQLAlchemy Base.metadata.create_all and will auto-create
-- this table in development. This SQL is for production migrations / reference.
CREATE TABLE IF NOT EXISTS expectations (
    session_id  VARCHAR(128) PRIMARY KEY,
    intensity   INTEGER NOT NULL DEFAULT 1,
    dependency  INTEGER NOT NULL DEFAULT 1,
    expression  INTEGER NOT NULL DEFAULT 1,
    note        TEXT,
    updated_at  TIMESTAMP DEFAULT NOW()
);
