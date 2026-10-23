import { Opcode } from "./constants.js";
import { toByte } from "./format.js";

/** @typedef {{ memory: number[], errors: string[] }} AssemblyResult */
/** @typedef {'add-sub'|'add-add'|'sub-sub'} Formula */

export const formulaNames = Object.freeze({
  "add-sub": "A + B - C",
  "add-add": "A + B + C",
  "sub-sub": "A - B - C",
});

const instruction = (op, address = 0x0f) => (op << 4) | address;

/** @param {number} a @param {number} b @param {number} c @param {Formula} formula @returns {number[]} */
export function compileFormula(a, b, c, formula) {
  const values = [a, b, c];
  if (
    !values.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 0xff,
    )
  )
    throw new RangeError("Formula values must be integers from 00H to FFH.");
  if (!Object.hasOwn(formulaNames, formula))
    throw new RangeError("Unknown formula.");
  const operation =
    formula === "add-sub"
      ? [Opcode.ADD, Opcode.SUB]
      : formula === "add-add"
        ? [Opcode.ADD, Opcode.ADD]
        : [Opcode.SUB, Opcode.SUB];
  const memory = Array(16).fill(0);
  memory.splice(
    0,
    5,
    instruction(Opcode.LDA, 0x09),
    instruction(operation[0], 0x0a),
    instruction(operation[1], 0x0b),
    instruction(Opcode.OUT),
    instruction(Opcode.HLT),
  );
  memory[9] = toByte(a);
  memory[10] = toByte(b);
  memory[11] = toByte(c);
  return memory;
}

/** @param {number} a @param {number} b @param {number} c @param {Formula} formula @returns {number} */
export function expectedFormula(a, b, c, formula) {
  if (![a, b, c].every((value) => Number.isInteger(value)))
    throw new TypeError("Formula values must be integers.");
  return toByte(
    formula === "add-sub"
      ? a + b - c
      : formula === "add-add"
        ? a + b + c
        : a - b - c,
  );
}

const parseOperand = (token) => {
  if (typeof token !== "string") return null;
  const clean = token.trim().replace(/H$/i, "");
  if (!/^[0-9a-f]$/i.test(clean)) return null;
  return Number.parseInt(clean, 16);
};

/** @param {string} source @returns {AssemblyResult} */
export function assemble(source) {
  const memory = Array(16).fill(0);
  const errors = [];
  if (typeof source !== "string")
    return { memory, errors: ["Program source must be text."] };
  const lines = source.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length > 16)
    errors.push("Program cannot contain more than 16 lines.");
  const opcodes = {
    LDA: Opcode.LDA,
    ADD: Opcode.ADD,
    SUB: Opcode.SUB,
    OUT: Opcode.OUT,
    HLT: Opcode.HLT,
  };
  lines.slice(0, 16).forEach((line, index) => {
    const text = line.trim();
    const machine = text.replace(/\s/g, "");
    if (/^[01]{8}$/.test(machine)) {
      memory[index] = Number.parseInt(machine, 2);
      return;
    }
    const parts = text.toUpperCase().split(/\s+/);
    const op = parts[0];
    if (!(op in opcodes)) {
      errors.push(`Line ${index + 1}: invalid mnemonic "${parts[0]}".`);
      return;
    }
    if (op === "OUT" || op === "HLT") {
      if (parts.length > 1)
        errors.push(`Line ${index + 1}: ${op} does not accept an operand.`);
      else memory[index] = instruction(opcodes[op]);
      return;
    }
    const address = parseOperand(parts[1]);
    if (address === null || parts.length !== 2)
      errors.push(`Line ${index + 1}: operand must be one hex digit (0H-FH).`);
    else memory[index] = instruction(opcodes[op], address);
  });
  return { memory, errors };
}
