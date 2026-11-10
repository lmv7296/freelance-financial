-- 004_create_tax_vault_tables.sql

CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY,
    tax_year INT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'NL',
    legal_form TEXT, -- 'eenmanszaak', 'bv', NULL = applies to all
    key TEXT NOT NULL, -- e.g. 'ib.box1.brackets'
    label TEXT NOT NULL, -- shown to the user
    value_type TEXT NOT NULL, -- amount | percentage | number | brackets | piecewise | list | deadline_rule
    value JSONB NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- matched against the tax profile
    source_url TEXT NOT NULL, -- official source, required
    verified_at DATE NOT NULL, -- when someone last checked it against the source
    valid_from DATE,
    valid_to DATE
);

CREATE INDEX IF NOT EXISTS idx_tax_rules_lookup ON tax_rules (tax_year, legal_form, key);

CREATE TABLE IF NOT EXISTS tax_profiles (
    company_id VARCHAR(64) PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    legal_form VARCHAR(50) NOT NULL DEFAULT 'eenmanszaak',
    vat_filing_frequency VARCHAR(20) NOT NULL DEFAULT 'quarter',
    uses_kor BOOLEAN NOT NULL DEFAULT false,
    meets_hours_criterion BOOLEAN,
    is_starter BOOLEAN NOT NULL DEFAULT false,
    reached_aow_age BOOLEAN NOT NULL DEFAULT false,
    other_box1_income_cents BIGINT,
    provisional_assessment_monthly_cents BIGINT,
    accountant_name VARCHAR(255),
    accountant_email VARCHAR(255),
    default_export_formats JSONB NOT NULL DEFAULT '["xlsx", "receipts_zip"]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_exports (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tax_year INT NOT NULL,
    period_key VARCHAR(50) NOT NULL,
    period_label VARCHAR(100) NOT NULL,
    formats JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    download_url TEXT,
    sent_to VARCHAR(255),
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tax_exports_company_year ON tax_exports (company_id, tax_year);

