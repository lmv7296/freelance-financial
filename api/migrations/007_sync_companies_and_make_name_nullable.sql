-- 007: sync any recent business data from users to companies, make companies.name nullable,
-- and clear the sign-up placeholder 'Mijn Bedrijf' to NULL so onboarding is properly triggered.
BEGIN;

-- 1. Copy business_name, vat_number, and phone_number from users to companies where filled in
WITH owner AS (
  SELECT DISTINCT ON (company_id)
         company_id, business_name, vat_number, country, phone_number
  FROM users
  WHERE company_id IS NOT NULL
  ORDER BY company_id, created_at
)
UPDATE companies c SET
  name       = COALESCE(NULLIF(TRIM(o.business_name), ''), c.name),
  vat_number = COALESCE(NULLIF(UPPER(REGEXP_REPLACE(o.vat_number, '[\s.]', '', 'g')), ''), c.vat_number),
  phone      = COALESCE(NULLIF(TRIM(o.phone_number), ''), c.phone),
  updated_at = now()
FROM owner o
WHERE o.company_id = c.id;

-- 2. Make companies.name nullable (a company created at sign-up starts without a name until onboarding)
ALTER TABLE companies ALTER COLUMN name DROP NOT NULL;

-- 3. Clear sign-up placeholder 'Mijn Bedrijf' to NULL so frontend treats business_name as empty
UPDATE companies
SET name = NULL, updated_at = now()
WHERE name = 'Mijn Bedrijf' OR TRIM(name) = '';

COMMIT;

