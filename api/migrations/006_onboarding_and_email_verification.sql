-- 006_onboarding_and_email_verification.sql

-- Drop outdated constraints so country and tax_regime can be initially NULL until onboarding
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_country_check;
ALTER TABLE users ALTER COLUMN country DROP NOT NULL;
ALTER TABLE users ALTER COLUMN country DROP DEFAULT;
ALTER TABLE users ALTER COLUMN tax_regime DROP NOT NULL;
ALTER TABLE users ALTER COLUMN tax_regime DROP DEFAULT;

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_email_verification_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_token_hash ON email_verification_tokens (token_hash);

