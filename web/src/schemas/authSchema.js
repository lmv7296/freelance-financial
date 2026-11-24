const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const AUTH_RULES = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 72,
};

/**
 * Placeholders for the validation messages. The validators return translation keys
 * (auth.validation.*); show them with t(error, AUTH_MESSAGE_VARS).
 */
export const AUTH_MESSAGE_VARS = {
  min: AUTH_RULES.PASSWORD_MIN_LENGTH,
  max: AUTH_RULES.PASSWORD_MAX_LENGTH,
  emailMax: AUTH_RULES.EMAIL_MAX_LENGTH,
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
    errors.email = "auth.validation.emailRequired";
  } else if (email.length > AUTH_RULES.EMAIL_MAX_LENGTH) {
    errors.email = "auth.validation.emailTooLong";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "auth.validation.emailInvalid";
  }

  if (!password) {
    errors.password = "auth.validation.passwordRequired";
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
    errors.email = "auth.validation.emailRequired";
  } else if (email.length > AUTH_RULES.EMAIL_MAX_LENGTH) {
    errors.email = "auth.validation.emailTooLong";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "auth.validation.emailInvalid";
  }

  if (!password) {
    errors.password = "auth.validation.passwordRequired";
  } else if (password.length < AUTH_RULES.PASSWORD_MIN_LENGTH) {
    errors.password = "auth.validation.passwordTooShort";
  } else if (password.length > AUTH_RULES.PASSWORD_MAX_LENGTH) {
    errors.password = "auth.validation.passwordTooLong";
  }

  if (confirmPassword !== undefined && confirmPassword !== password) {
    errors.confirmPassword = "auth.validation.passwordMismatch";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
