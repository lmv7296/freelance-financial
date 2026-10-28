const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const AUTH_RULES = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 72,
};

/**
 * Validates login payload
 * @param {{ email?: string; password?: string }} payload
 * @returns {{ isValid: boolean; errors: { email?: string; password?: string } }}
 */
export function validateLogin(payload = {}) {
  const errors = {};
  const email = (payload.email || "").trim();
  const password = payload.password || "";

  if (!email) {
    errors.email = "E-mailadres is verplicht";
  } else if (email.length > AUTH_RULES.EMAIL_MAX_LENGTH) {
    errors.email = `E-mailadres mag maximaal ${AUTH_RULES.EMAIL_MAX_LENGTH} tekens bevatten`;
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Voer een geldig e-mailadres in";
  }

  if (!password) {
    errors.password = "Wachtwoord is verplicht";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates registration payload with strict password length constraints
 * @param {{ email?: string; password?: string; confirmPassword?: string }} payload
 * @returns {{ isValid: boolean; errors: { email?: string; password?: string; confirmPassword?: string } }}
 */
export function validateRegister(payload = {}) {
  const errors = {};
  const email = (payload.email || "").trim();
  const password = payload.password || "";
  const confirmPassword = payload.confirmPassword;

  if (!email) {
    errors.email = "E-mailadres is verplicht";
  } else if (email.length > AUTH_RULES.EMAIL_MAX_LENGTH) {
    errors.email = `E-mailadres mag maximaal ${AUTH_RULES.EMAIL_MAX_LENGTH} tekens bevatten`;
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Voer een geldig e-mailadres in";
  }

  if (!password) {
    errors.password = "Wachtwoord is verplicht";
  } else if (password.length < AUTH_RULES.PASSWORD_MIN_LENGTH) {
    errors.password = `Wachtwoord moet minimaal ${AUTH_RULES.PASSWORD_MIN_LENGTH} tekens lang zijn`;
  } else if (password.length > AUTH_RULES.PASSWORD_MAX_LENGTH) {
    errors.password = `Wachtwoord mag maximaal ${AUTH_RULES.PASSWORD_MAX_LENGTH} tekens bevatten`;
  }

  if (confirmPassword !== undefined && confirmPassword !== password) {
    errors.confirmPassword = "Wachtwoorden komen niet overeen";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
