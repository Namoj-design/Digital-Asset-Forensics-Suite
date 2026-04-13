-- DAFS Forensics MVP — PostgreSQL schema
-- Use a dedicated database (e.g. dafs_forensics) to avoid clashing with legacy tables.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(64) NOT NULL DEFAULT 'investigator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  description TEXT,
  chain VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'open',
  created_by INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_chain ON cases (chain);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases (created_by);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at DESC);

CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  address VARCHAR(256) NOT NULL,
  chain VARCHAR(64) NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (address, chain)
);

CREATE INDEX IF NOT EXISTS idx_addresses_address ON addresses (address);
CREATE INDEX IF NOT EXISTS idx_addresses_chain ON addresses (chain);
CREATE INDEX IF NOT EXISTS idx_addresses_risk_score ON addresses (risk_score);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(128) NOT NULL,
  from_address VARCHAR(256) NOT NULL,
  to_address VARCHAR(256) NOT NULL,
  value NUMERIC(38, 18) NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain VARCHAR(64) NOT NULL,
  UNIQUE (tx_hash, chain)
);

CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions (tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions (from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions (to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions (chain);

CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  file_name VARCHAR(512) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence (case_id);
