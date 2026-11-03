import {
  ADDRESS_BITS,
  encodeInstruction,
  NO_OPERAND_MNEMONICS,
  OPCODES,
  RAM_SIZE,
} from "./config.js";
import { parseHex } from "./utils.js";
export function parseQuickEntry(text) {
  const ram = Array(RAM_SIZE).fill(0);
  const entries = Array(RAM_SIZE).fill(null);
  const errors = [];
  String(text)
    .split("\n")
    .forEach((line, index) => {
      const clean = line.trim();
      if (!clean) return;
      const match = clean.match(/^([^:]+)\s*:\s*(.*?)\s*$/);
      if (!match) {
        errors.push(`Line ${index + 1}: use "0: LDA 9" or "9: 25H".`);
        return;
      }
      const addressValue = parseHex(match[1]);
      if (addressValue === null || addressValue >= RAM_SIZE)
        return errors.push(
          `Line ${index + 1}: address must be between 0 and ${(RAM_SIZE - 1)
            .toString(16)
            .toUpperCase()}H.`,
        );

      const address = addressValue & ((1 << ADDRESS_BITS) - 1);
      const parts = match[2].split(/\s+/).filter(Boolean);
      const mnemonic = parts[0]?.toUpperCase();
      if (mnemonic && Object.hasOwn(OPCODES, mnemonic)) {
        if (NO_OPERAND_MNEMONICS.includes(mnemonic)) {
          if (parts.length !== 1)
            return errors.push(
              `Line ${index + 1}: ${mnemonic} does not accept an operand.`,
            );
          ram[address] = encodeInstruction(mnemonic);
          entries[address] = { kind: "instruction", mnemonic, operand: null };
          return;
        }
        if (parts.length !== 2) {
          errors.push(
            `Line ${index + 1}: ${mnemonic} needs a 0H to FH operand.`,
          );
          return;
        }
        const operand = parseHex(parts[1]);
        if (operand === null || operand >= RAM_SIZE) {
          errors.push(`Line ${index + 1}: operand must be between 0H and FH.`);
          return;
        }
        ram[address] = encodeInstruction(mnemonic, operand);
        entries[address] = { kind: "instruction", mnemonic, operand };
        return;
      }

      const value = parseHex(match[2]);
      if (value === null) {
        errors.push(
          `Line ${index + 1}: unknown instruction or data value; use a valid mnemonic or 00H to FFH.`,
        );
        return;
      }
      ram[address] = value;
      entries[address] = { kind: "data", value };
    });
  return { ram, entries, errors };
}
