-- 006: remove the old copies of the business data.
-- Run ONLY after the Go backend reads and writes these fields on companies
-- (companies.name, legal_form, tax_regime, vat_number, ...). Before that, it breaks the API.
BEGIN;

ALTER TABLE users
  DROP COLUMN business_name,
  DROP COLUMN vat_number,
  DROP COLUMN tax_regime;

-- company_settings was a 1-to-1 copy of the company; its fields now live on companies
DROP TABLE company_settings;

-- companies.legal_form is now the only place for the legal form
ALTER TABLE tax_profiles DROP COLUMN legal_form;

COMMIT;
