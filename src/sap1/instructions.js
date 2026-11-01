export const INSTRUCTIONS = {
  LDA: 0x0,
  ADD: 0x1,
  SUB: 0x2,
  OUT: 0xe,
  HLT: 0xf,
};
export const MNEMONICS = Object.fromEntries(
  Object.entries(INSTRUCTIONS).map(([name, code]) => [code, name]),
);
export const SIGNALS = [
  "Ep",
  "Lm",
  "CE",
  "Li",
  "Ei",
  "La",
  "Ea",
  "Eu",
  "Su",
  "Lb",
  "Lo",
  "Cp",
];
export function decode(byte) {
  return {
    opcode: (byte >> 4) & 0xf,
    operand: byte & 0xf,
    mnemonic: MNEMONICS[(byte >> 4) & 0xf],
  };
}
export function formatInstruction(byte) {
  const { mnemonic, operand } = decode(byte);
  if (!mnemonic) return "DATA";
  return ["OUT", "HLT"].includes(mnemonic)
    ? mnemonic
    : `${mnemonic} ${operand.toString(16).toUpperCase()}H`;
}
