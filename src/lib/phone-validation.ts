/**
 * Shared phone number validation and sanitization utilities.
 * Syrian mobile numbers: must be 09XXXXXXXX (10 digits).
 */

const PHONE_ERROR = "رقم الهاتف غير صالح — أدخل رقم موبايل سوري (مثال: 0998071345)";

/** Strip spaces, dashes, parentheses from phone numbers */
export function sanitizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, "");
}

/**
 * Normalize a phone number to Syrian 09XXXXXXXX format.
 * Handles: +963 9XXXXXXXX, 00963 9XXXXXXXX, 963 9XXXXXXXX, 09XXXXXXXX
 */
export function normalizeSyrianPhone(raw: string): string {
  let cleaned = sanitizePhone(raw);

  // Remove leading +
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);

  // Remove leading 00 (international dialing prefix)
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);

  // Remove country code 963
  if (cleaned.startsWith("963")) cleaned = cleaned.slice(3);

  // Ensure leading 0
  if (cleaned.startsWith("9") && !cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }

  return cleaned;
}

/** Check if a phone value is a placeholder "no-phone-" UUID */
export function isPlaceholderPhone(phone: string | null | undefined): boolean {
  if (!phone) return true;
  return phone.startsWith("no-phone-");
}

/** Clean phone for display — returns empty string for placeholder phones */
export function displayPhone(phone: string | null | undefined): string {
  if (!phone || isPlaceholderPhone(phone)) return "";
  return phone;
}

/** Validate phone number: Syrian mobile, must be 09XXXXXXXX (10 digits) */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const normalized = normalizeSyrianPhone(phone);

  // Must be only digits
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: PHONE_ERROR };
  }

  // Must start with 09 and be exactly 10 digits
  if (!/^09\d{8}$/.test(normalized)) {
    return { valid: false, error: PHONE_ERROR };
  }

  return { valid: true };
}
