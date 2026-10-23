export const toByte = (value) => value & 0xff;
export const toNibble = (value) => value & 0x0f;
export const hex8 = (value) =>
  `${toByte(value).toString(16).toUpperCase().padStart(2, "0")}H`;
export const hex4 = (value) => `${toNibble(value).toString(16).toUpperCase()}H`;
export const binary8 = (value) => toByte(value).toString(2).padStart(8, "0");
export const binary4 = (value) => toNibble(value).toString(2).padStart(4, "0");

export function parseNumber(value, base) {
  if (typeof value !== "string" || (base !== 10 && base !== 16)) return null;
  const trimmed = value.trim().replace(/H$/i, "");
  if (
    !trimmed ||
    !/^[0-9a-f]+$/i.test(trimmed) ||
    (base === 10 && !/^\d+$/.test(trimmed))
  )
    return null;
  const parsed = Number.parseInt(trimmed, base);
  return Number.isInteger(parsed) ? parsed : null;
}
