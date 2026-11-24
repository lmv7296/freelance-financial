-- Migration 001: Companies, User association, and Company Lists

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure users table has company_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE users ADD COLUMN company_id VARCHAR(64);
    END IF;
END $$;

-- Company Lists table
CREATE TABLE IF NOT EXISTS company_lists (
    company_id VARCHAR(64) PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    merchants JSONB NOT NULL DEFAULT '[]'::jsonb,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

