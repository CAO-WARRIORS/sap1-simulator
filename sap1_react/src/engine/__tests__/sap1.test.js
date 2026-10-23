import { describe, expect, it } from "vitest";
import { assemble, compileFormula, expectedFormula } from "../assembler.js";
import { Opcode } from "../constants.js";
import {
  createInitialState,
  loadProgram,
  microStep,
  reset,
  runToHalt,
  stepInstruction,
} from "../sap1.js";

const run = (memory) => runToHalt(loadProgram(createInitialState(), memory));
const op = (opcode, operand = 0xf) => (opcode << 4) | operand;

describe("SAP-1 engine", () => {
  it("computes the reference 25H + 05H - 23H sample", () =>
    expect(run(compileFormula(0x25, 0x05, 0x23, "add-sub")).output).toBe(0x07));
  it.each([
    [1, 2, 3, "add-sub"],
    [0xf0, 0x20, 0x10, "add-add"],
    [5, 0x23, 2, "sub-sub"],
  ])("computes formula %s", (a, b, c, formula) =>
    expect(run(compileFormula(a, b, c, formula)).output).toBe(
      expectedFormula(a, b, c, formula),
    ),
  );
  it("wraps subtraction to eight bits and reports carry state", () => {
    const state = run(compileFormula(5, 0x23, 0, "sub-sub"));
    expect(state.output).toBe(0xe2);
    expect(state.carry).toBe(true);
  });
  it("wraps the PC after address FH", () => {
    const state = loadProgram(createInitialState(), [op(Opcode.LDA, 9)]);
    const atF = { ...state, pc: 0xf, tState: 1 };
    expect(microStep(atF).state.pc).toBe(0xf);
    expect(microStep(microStep(atF).state).state.pc).toBe(0);
  });
  it.each([
    [Opcode.LDA],
    [Opcode.ADD],
    [Opcode.SUB],
    [Opcode.OUT],
    [Opcode.HLT],
  ])("recognizes opcode %s", (opcode) =>
    expect(
      run([op(opcode, 9), op(Opcode.HLT), 0, 0, 0, 0, 0, 0, 0, 7]).status,
    ).toBe("Halted"),
  );
  it("halts illegal opcodes with an error", () => {
    const state = stepInstruction(loadProgram(createInitialState(), [0x30]));
    expect(state.status).toBe("Error");
    expect(state.error).toMatch(/Illegal opcode/);
  });
  it("produces the LDA T-state sequence", () => {
    let state = loadProgram(createInitialState(), [
      op(Opcode.LDA, 9),
      op(Opcode.HLT),
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0x7a,
    ]);
    const states = [];
    for (let index = 0; index < 6; index += 1) {
      const result = microStep(state);
      states.push(result.tState);
      state = result.state;
    }
    expect(states).toEqual([2, 3, 4, 5, 6, 1]);
    expect(state.a).toBe(0x7a);
  });
  it("resets all registers and output", () =>
    expect(reset()).toMatchObject({
      pc: 0,
      mar: 0,
      ir: 0,
      a: 0,
      b: 0,
      output: 0,
      status: "Ready",
    }));
});

describe("assembler", () => {
  it("assembles mnemonics and machine code", () => {
    const result = assemble("LDA 9H\n0001 1010\nOUT\nHLT");
    expect(result.errors).toEqual([]);
    expect(result.memory.slice(0, 4)).toEqual([0x09, 0x1a, 0xef, 0xff]);
  });
  it("reports invalid mnemonic, operand, and length", () => {
    const result = assemble(
      "WHAT 1H\nLDA 10H\n" + Array(16).fill("HLT").join("\n"),
    );
    expect(result.errors.join(" ")).toMatch(/invalid mnemonic/);
    expect(result.errors.join(" ")).toMatch(/operand/);
    expect(result.errors.join(" ")).toMatch(/more than 16/);
  });
});
