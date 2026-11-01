export const mask8 = (value) => value & 0xff;
export const mask4 = (value) => value & 0xf;
export function toBin(value, bits = 8) {
  return (value & ((1 << bits) - 1)).toString(2).padStart(bits, "0");
}
export function groupedBin(value, bits = 8) {
  return toBin(value, bits)
    .match(/.{1,4}/g)
    .join(" ");
}
export function toHex(value, digits = 2) {
  return `${(value & ((1 << (digits * 4)) - 1)).toString(16).toUpperCase().padStart(digits, "0")}H`;
}
export function parseHex(value) {
  const text = String(value).trim().replace(/H$/i, "");
  return /^[0-9a-f]{1,2}$/i.test(text) ? Number.parseInt(text, 16) : null;
}
