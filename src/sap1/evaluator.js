import { EVALUATION_STEP_LIMIT } from "./config.js";
import { decode } from "./instructions.js";
import { mask4, mask8 } from "./utils.js";

export function evaluateProgram(ram) {
  let pc = 0;
  let a = 0;
  let out = 0;
  let outputSeen = false;
  let halted = false;
  let steps = 0;

  while (!halted && steps < EVALUATION_STEP_LIMIT) {
    const instruction = mask8(ram[pc] || 0);
    const { mnemonic, operand } = decode(instruction);
    if (!mnemonic) break;

    if (mnemonic === "LDA") a = mask8(ram[operand] || 0);
    if (mnemonic === "ADD") a = mask8(a + (ram[operand] || 0));
    if (mnemonic === "SUB") a = mask8(a - (ram[operand] || 0));
    if (mnemonic === "OUT") {
      out = a;
      outputSeen = true;
    }
    if (mnemonic === "HLT") halted = true;

    pc = mask4(pc + 1);
    steps += 1;
  }

  return {
    out,
    outputSeen,
    halted,
    steps,
  };
}
