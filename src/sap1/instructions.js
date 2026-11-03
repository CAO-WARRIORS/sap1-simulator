import {
  ADDRESS_BITS,
  MNEMONICS,
  NIBBLE_BITS,
  NO_OPERAND_MNEMONICS,
  OPCODES,
} from "./config.js";

export function decode(byte) {
  return {
    opcode: (byte >> ADDRESS_BITS) & ((1 << ADDRESS_BITS) - 1),
    operand: byte & ((1 << NIBBLE_BITS) - 1),
    mnemonic: MNEMONICS[(byte >> ADDRESS_BITS) & ((1 << ADDRESS_BITS) - 1)],
  };
}
export function formatInstruction(byte) {
  const { mnemonic, operand } = decode(byte);
  if (!mnemonic) return "DATA";
  return NO_OPERAND_MNEMONICS.includes(mnemonic)
    ? mnemonic
    : `${mnemonic} ${operand.toString(16).toUpperCase()}H`;
}

export { OPCODES };
