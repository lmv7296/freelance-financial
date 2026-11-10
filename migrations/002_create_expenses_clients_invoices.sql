-- Migration 002: Clients, Invoices, and Expenses

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);

CREATE TABLE IF NOT EXISTS company_invoices (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(64) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal_cents BIGINT NOT NULL DEFAULT 0,
    vat_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_invoices_company_id ON company_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invoices_client_id ON company_invoices(client_id);

CREATE TABLE IF NOT EXISTS company_expenses (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'approved',
    source VARCHAR(32) NOT NULL DEFAULT 'manual',
    sender_name VARCHAR(255),
    sender_phone VARCHAR(64),
    merchant_name VARCHAR(255) NOT NULL,
    merchant_address TEXT,
    receipt_date DATE,
    payment_method VARCHAR(64),
    category VARCHAR(128),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    subtotal_cents BIGINT,
    vat_cents BIGINT,
    total_cents BIGINT NOT NULL,
    vat_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    receipt_url TEXT NOT NULL DEFAULT '',
    receipt_content_type VARCHAR(128),
    receipt_file_path TEXT,
    extraction_confidence NUMERIC(3,2),
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    invoice_id VARCHAR(64) REFERENCES company_invoices(id) ON DELETE SET NULL,
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_company_id ON company_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_company_expenses_status ON company_expenses(status);
CREATE INDEX IF NOT EXISTS idx_company_expenses_receipt_date ON company_expenses(receipt_date);
CREATE INDEX IF NOT EXISTS idx_company_expenses_created_at ON company_expenses(created_at);
