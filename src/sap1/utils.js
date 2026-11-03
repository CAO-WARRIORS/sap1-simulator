import { ADDRESS_BITS, DATA_BITS, NIBBLE_BITS } from "./config.js";

export const mask8 = (value) => value & ((1 << DATA_BITS) - 1);
export const mask4 = (value) => value & ((1 << ADDRESS_BITS) - 1);
export function toBin(value, bits = DATA_BITS) {
  return (value & ((1 << bits) - 1)).toString(2).padStart(bits, "0");
}
export function groupedBin(value, bits = DATA_BITS) {
  return toBin(value, bits)
    .match(new RegExp(`.{1,${NIBBLE_BITS}}`, "g"))
    .join(" ");
}
export function toHex(value, digits = DATA_BITS / NIBBLE_BITS) {
  return `${(value & ((1 << (digits * NIBBLE_BITS)) - 1)).toString(16).toUpperCase().padStart(digits, "0")}H`;
}
export function parseHex(value) {
  const text = String(value).trim().replace(/H$/i, "");
  const pattern = new RegExp(`^[0-9a-f]{1,${DATA_BITS / NIBBLE_BITS}}$`, "i");
  return pattern.test(text) ? Number.parseInt(text, 16) : null;
}
