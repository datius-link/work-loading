const TZ_COUNTRY_CODE = "255";

export function normalizePhoneNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `${TZ_COUNTRY_CODE}${digits.slice(1)}`;
  }
  if (digits.length === 9 && /^[67]/.test(digits)) {
    digits = `${TZ_COUNTRY_CODE}${digits}`;
  }

  if (!/^\d{10,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export function normalizePhoneList(value) {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.map(normalizePhoneNumber).filter(Boolean))];
}
