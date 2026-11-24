-- 008_add_status_due_date_paid_at_to_company_invoices.sql
-- Add status, due_date, paid_at, and currency to company_invoices
ALTER TABLE company_invoices
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    ADD COLUMN IF NOT EXISTS due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS paid_at DATE,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

-- Add check constraint on allowed status values
ALTER TABLE company_invoices
    DROP CONSTRAINT IF EXISTS chk_company_invoices_status;

ALTER TABLE company_invoices
    ADD CONSTRAINT chk_company_invoices_status
    CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_company_invoices_due_date ON company_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_company_invoices_status ON company_invoices(status);

