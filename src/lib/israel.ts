// Israeli-specific validation helpers.

// Validates a ת"ז using the official check-digit algorithm (pads to 9 digits).
export function isValidIsraeliId(raw: string): boolean {
  const id = raw.trim();
  if (!/^\d{5,9}$/.test(id)) return false;
  const digits = id.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

// Normalizes an Israeli phone number to E.164 (+9725XXXXXXXX), the format
// WhatsApp and SMS providers expect. Returns null if it isn't a valid number.
export function normalizeIsraeliPhone(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+972")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  // Mobile (05X-XXXXXXX) or landline (0X-XXXXXXX / 07X-XXXXXXX).
  if (!/^0(5\d{8}|7\d{8}|[2-489]\d{7})$/.test(digits)) return null;
  return "+972" + digits.slice(1);
}
