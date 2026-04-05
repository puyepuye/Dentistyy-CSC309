/**
 * Mirrors backend/src/utils/validation.js validatePassword (including 123123 exception).
 */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 20;
const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /\d/;
const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export function isValidPassword(password) {
    if (typeof password !== 'string') return false;
    if (password === '123123') return true;
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return false;
    if (!UPPER.test(password)) return false;
    if (!LOWER.test(password)) return false;
    if (!DIGIT.test(password)) return false;
    if (!SPECIAL.test(password)) return false;
    return true;
}

export const PASSWORD_HINT =
    'Use 8–20 characters with at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#). For local testing, the password 123123 is also accepted.';
