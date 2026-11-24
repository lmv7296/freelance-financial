-- 003_create_settings_tables.sql

CREATE TABLE IF NOT EXISTS company_settings (
    company_id VARCHAR(64) PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL DEFAULT '',
    trade_name VARCHAR(255) NOT NULL DEFAULT '',
    kvk_number VARCHAR(20) NOT NULL DEFAULT '',
    vat_number VARCHAR(30) NOT NULL DEFAULT '',
    street VARCHAR(255) NOT NULL DEFAULT '',
    postal_code VARCHAR(20) NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT '',
    country VARCHAR(10) NOT NULL DEFAULT 'NL',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    website VARCHAR(255) NOT NULL DEFAULT '',
    iban VARCHAR(50) NOT NULL DEFAULT '',
    logo_url VARCHAR(500) NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_defaults (
    company_id VARCHAR(64) PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    payment_term_days INT NOT NULL DEFAULT 14,
    number_prefix VARCHAR(50) NOT NULL DEFAULT 'FACT-',
    next_number INT NOT NULL DEFAULT 1,
    number_padding INT NOT NULL DEFAULT 4,
    default_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21,
    default_payment_method VARCHAR(50) NOT NULL DEFAULT 'PIN / Betaalpas',
    footer_text TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_senders (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    receipts_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_whatsapp_senders_company_phone UNIQUE (company_id, phone)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'nl',
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
