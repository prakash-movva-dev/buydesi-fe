// Shared client-side field validators for admin forms (user/seller creation).
// Each returns an error string when invalid, or null when the value is acceptable.

// Letters (incl. accented), spaces, and common name punctuation: . ' -
const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;
// Indian mobile: 10 digits starting 6-9, optionally prefixed with +91 / 91 / 0.
const MOBILE_RE = /^(?:\+?91|0)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_RE = /^\d{6}$/;

export const validateName = (value: string): string | null => {
  const v = value.trim();
  if (v.length < 2) return 'Name is required (min 2 characters).';
  if (!NAME_RE.test(v))
    return "Name can only contain letters, spaces, and . ' -";
  return null;
};

/** Validates an Indian mobile number. Pass `required` to reject an empty value. */
export const validateMobile = (value: string, required = false): string | null => {
  const v = value.trim();
  if (!v) return required ? 'Mobile number is required.' : null;
  if (!/^[\d+]+$/.test(v)) return 'Mobile number must contain digits only.';
  if (!MOBILE_RE.test(v))
    return 'Enter a valid 10-digit Indian mobile (optionally +91).';
  return null;
};

/** Validates an email address. Pass `required` to reject an empty value. */
export const validateEmail = (value: string, required = false): string | null => {
  const v = value.trim();
  if (!v) return required ? 'Email is required.' : null;
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
  return null;
};

export const validatePincode = (value: string): string | null => {
  if (!PINCODE_RE.test(value.trim())) return 'PIN code must be 6 digits.';
  return null;
};

/** Normalises a mobile input to bare 10 digits (drops +91 / 91 / 0 prefixes). */
export const normalizeMobile = (value: string): string =>
  value.trim().replace(/^(?:\+?91|0)/, '');
