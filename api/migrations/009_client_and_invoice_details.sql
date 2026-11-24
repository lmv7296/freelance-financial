-- 009_client_and_invoice_details.sql
-- Clients and invoices can now be created from the app, so store the details
-- the Klanten and Facturen pages work with. Only adds columns; existing rows
-- keep working through the defaults.

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'particulier',
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS kvk_number VARCHAR(8),
    ADD COLUMN IF NOT EXISTS vat_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS site_note TEXT;

ALTER TABLE clients
    DROP CONSTRAINT IF EXISTS chk_clients_type;

ALTER TABLE clients
    ADD CONSTRAINT chk_clients_type
    CHECK (type IN ('particulier', 'bedrijf'));

ALTER TABLE company_invoices
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS trade_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(64),
    ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 21,
    ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Lookups by number when checking for duplicates
CREATE INDEX IF NOT EXISTS idx_company_invoices_company_number
    ON company_invoices(company_id, invoice_number);
