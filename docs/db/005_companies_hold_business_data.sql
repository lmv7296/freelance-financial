-- 005: the companies table holds the user's own business data.
-- Adds columns and copies data only; nothing is dropped (see 006).
BEGIN;

-- 1. New columns. companies.name already exists and stays the legal (KvK) name.
--    legal_form is nullable: a company is created at sign-up, before onboarding.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS trade_name        varchar(255),
  ADD COLUMN IF NOT EXISTS legal_form        varchar(20),
  ADD COLUMN IF NOT EXISTS tax_regime        varchar(50),
  ADD COLUMN IF NOT EXISTS started_on        date,
  ADD COLUMN IF NOT EXISTS kvk_number        varchar(8),
  ADD COLUMN IF NOT EXISTS kvk_branch_number varchar(12),
  ADD COLUMN IF NOT EXISTS vat_number        varchar(30),
  ADD COLUMN IF NOT EXISTS rsin              varchar(9),
  ADD COLUMN IF NOT EXISTS street            varchar(255),
  ADD COLUMN IF NOT EXISTS postal_code       varchar(20),
  ADD COLUMN IF NOT EXISTS city              varchar(100),
  ADD COLUMN IF NOT EXISTS country           char(2) NOT NULL DEFAULT 'NL',
  ADD COLUMN IF NOT EXISTS email             varchar(255),
  ADD COLUMN IF NOT EXISTS phone             varchar(50),
  ADD COLUMN IF NOT EXISTS website           varchar(255),
  ADD COLUMN IF NOT EXISTS iban              varchar(34),
  ADD COLUMN IF NOT EXISTS iban_holder_name  varchar(255),
  ADD COLUMN IF NOT EXISTS logo_path         varchar(500);

-- 2. Every user needs a company: create one for users that don't have one yet
--    (ids in the same format as existing ones: 32 hex characters)
CREATE TEMP TABLE new_companies ON COMMIT DROP AS
SELECT u.id AS user_id,
       replace(gen_random_uuid()::text, '-', '') AS company_id,
       COALESCE(NULLIF(TRIM(u.business_name), ''), 'Mijn Bedrijf') AS name
FROM users u
WHERE u.company_id IS NULL
   OR u.company_id NOT IN (SELECT id FROM companies);

INSERT INTO companies (id, name)
SELECT company_id, name FROM new_companies;

UPDATE users u SET company_id = n.company_id
FROM new_companies n
WHERE n.user_id = u.id;

-- 3. Copy the business fields from the company's first user
WITH owner AS (
  SELECT DISTINCT ON (company_id)
         company_id, business_name, vat_number, tax_regime, country, phone_number
  FROM users
  WHERE company_id IS NOT NULL
  ORDER BY company_id, created_at
)
UPDATE companies c SET
  name       = COALESCE(NULLIF(TRIM(o.business_name), ''), c.name),
  vat_number = COALESCE(c.vat_number, NULLIF(UPPER(REGEXP_REPLACE(o.vat_number, '[\s.]', '', 'g')), '')),
  tax_regime = COALESCE(c.tax_regime, NULLIF(TRIM(o.tax_regime), '')),
  country    = COALESCE(NULLIF(UPPER(TRIM(o.country)), ''), c.country),
  phone      = COALESCE(c.phone, NULLIF(TRIM(o.phone_number), '')),
  updated_at = now()
FROM owner o
WHERE o.company_id = c.id;

-- 4. Legal form comes from the existing tax profile
UPDATE companies c SET legal_form = t.legal_form
FROM tax_profiles t
WHERE t.company_id = c.id AND c.legal_form IS NULL;

-- 5. Copy from company_settings (entered deliberately in Settings, so these win).
--    Its empty fields are '' instead of NULL, hence the NULLIFs.
UPDATE companies c SET
  name        = COALESCE(NULLIF(TRIM(s.company_name), ''), c.name),
  trade_name  = COALESCE(NULLIF(TRIM(s.trade_name), ''), c.trade_name),
  kvk_number  = COALESCE(NULLIF(REGEXP_REPLACE(s.kvk_number, '\s', '', 'g'), ''), c.kvk_number),
  vat_number  = COALESCE(NULLIF(UPPER(REGEXP_REPLACE(s.vat_number, '[\s.]', '', 'g')), ''), c.vat_number),
  street      = COALESCE(NULLIF(TRIM(s.street), ''), c.street),
  postal_code = COALESCE(NULLIF(TRIM(s.postal_code), ''), c.postal_code),
  city        = COALESCE(NULLIF(TRIM(s.city), ''), c.city),
  country     = COALESCE(NULLIF(UPPER(TRIM(s.country)), ''), c.country),
  email       = COALESCE(NULLIF(TRIM(s.email), ''), c.email),
  phone       = COALESCE(NULLIF(TRIM(s.phone), ''), c.phone),
  website     = COALESCE(NULLIF(TRIM(s.website), ''), c.website),
  iban        = COALESCE(NULLIF(UPPER(REGEXP_REPLACE(s.iban, '\s', '', 'g')), ''), c.iban),
  logo_path   = COALESCE(NULLIF(TRIM(s.logo_url), ''), c.logo_path),
  updated_at  = now()
FROM company_settings s
WHERE s.company_id = c.id;

-- 6. Rules (after copying, so bad old data stops the migration instead of slipping in)
ALTER TABLE companies
  ADD CONSTRAINT companies_legal_form_check CHECK (legal_form IN ('eenmanszaak', 'vof', 'bv')),
  ADD CONSTRAINT companies_kvk_number_check CHECK (kvk_number ~ '^[0-9]{8}$'),
  ADD CONSTRAINT companies_kvk_branch_check CHECK (kvk_branch_number ~ '^[0-9]{12}$'),
  ADD CONSTRAINT companies_rsin_check       CHECK (rsin ~ '^[0-9]{9}$'),
  ADD CONSTRAINT companies_country_check    CHECK (country ~ '^[A-Z]{2}$');

CREATE UNIQUE INDEX IF NOT EXISTS companies_kvk_number_key
  ON companies (kvk_number) WHERE kvk_number IS NOT NULL;

-- 7. Owner/member, for when a company gets 1–2 users later
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'owner'
  CONSTRAINT users_role_check CHECK (role IN ('owner', 'member'));

COMMIT;
