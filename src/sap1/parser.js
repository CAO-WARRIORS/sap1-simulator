import { INSTRUCTIONS } from "./instructions.js";
import { parseHex } from "./utils.js";
export function parseQuickEntry(text) {
  const ram = Array(16).fill(0);
  const errors = [];
  String(text)
    .split("\n")
    .forEach((line, index) => {
      const clean = line.trim();
      if (!clean) return;
      const match = clean.match(
        /^([0-9a-f])\s*:\s*(?:(LDA|ADD|SUB)\s+([0-9a-f])|(OUT|HLT)|([0-9a-f]{1,2})H?)$/i,
      );
      if (!match) {
        errors.push(`Line ${index + 1}: use "0: LDA 9" or "9: 25H".`);
        return;
      }
      const address = Number.parseInt(match[1], 16);
      if (match[2])
        ram[address] =
          INSTRUCTIONS[match[2].toUpperCase()] * 16 +
          Number.parseInt(match[3], 16);
      else if (match[4])
        ram[address] = INSTRUCTIONS[match[4].toUpperCase()] * 16;
      else ram[address] = parseHex(match[5]);
    });
  return { ram, errors };
}
