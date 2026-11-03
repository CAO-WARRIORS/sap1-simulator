import { describe, expect, it } from "vitest";
import { createInitialState, loadProgram, microStep, step } from "./cpu.js";
import { evaluateProgram } from "./evaluator.js";
import { parseQuickEntry } from "./parser.js";

function run(program, count) {
  let state = loadProgram(createInitialState(), program);
  for (let index = 0; index < count; index += 1) state = step(state);
  return state;
}

describe("SAP-1 CPU", () => {
  it("runs the sample program to 07H and halts", () => {
    const parsed = parseQuickEntry(
      "0: LDA 9\n1: ADD A\n2: SUB B\n3: OUT\n4: HLT\n9: 25H\nA: 05H\nB: 23H",
    );
    const state = run(parsed.ram, 5);
    expect(parsed.errors).toEqual([]);
    expect(state.out).toBe(0x07);
    expect(state.halted).toBe(true);
  });

  it("wraps subtraction underflow to 8 bits", () => {
    const parsed = parseQuickEntry(
      "0: LDA 9\n1: SUB A\n2: OUT\n3: HLT\n9: 05H\nA: 07H",
    );
    const state = run(parsed.ram, 4);
    expect(state.out).toBe(0xfe);
  });

  it("wraps the program counter from 15 to 0 during fetch", () => {
    const ram = Array(16).fill(0);
    ram[15] = 0xf0;
    const state = microStep({
      ...loadProgram(createInitialState(), ram),
      pc: 15,
    });
    expect(state.pc).toBe(15);
    const next = microStep(state);
    expect(next.pc).toBe(0);
  });

  it("advances through all six T-states and wraps T6 to T1", () => {
    let state = loadProgram(createInitialState(), [0x00, ...Array(15).fill(0)]);
    const tStates = [];
    for (let index = 0; index < 6; index += 1) {
      state = microStep(state);
      tStates.push(state.tState);
    }
    expect(tStates).toEqual([1, 2, 3, 4, 5, 6]);
    expect(state.status).toBe("T6: No operation (NOP).");
    expect(microStep(state).tState).toBe(1);
  });

  it("keeps T6 visible for an LDA execute NOP", () => {
    let state = loadProgram(createInitialState(), [
      0x09,
      ...Array(8).fill(0),
      0x25,
      ...Array(6).fill(0),
    ]);
    for (let index = 0; index < 6; index += 1) state = microStep(state);
    expect(state.tState).toBe(6);
    expect(state.status).toBe("T6: No operation (NOP).");
  });

  it("executes OUT and HLT without changing A", () => {
    const parsed = parseQuickEntry("0: LDA 9\n1: OUT\n2: HLT\n9: 2AH");
    const state = run(parsed.ram, 3);
    expect(state.out).toBe(0x2a);
    expect(state.a).toBe(0x2a);
    expect(state.halted).toBe(true);
  });

  it("reports malformed quick-entry lines", () => {
    const result = parseQuickEntry("0: NOPE 9\nG: 25H");
    expect(result.errors).toHaveLength(2);
  });

  it("evaluates add, subtract, and arbitrary data-address programs", () => {
    const programs = [
      ["0: LDA E\n1: ADD C\n2: OUT\n3: HLT\nC: 08\nE: 12", 0x1a],
      ["0: LDA D\n1: SUB B\n2: OUT\n3: HLT\nB: 07H\nD: 20H", 0x19],
      ["0: LDA F\n1: OUT\n2: HLT\nF: 2A", 0x2a],
    ];

    programs.forEach(([text, expected]) => {
      const parsed = parseQuickEntry(text);
      expect(parsed.errors).toEqual([]);
      expect(evaluateProgram(parsed.ram).out).toBe(expected);
      expect(run(parsed.ram, 4).out).toBe(expected);
    });
  });

  it("encodes no-operand instructions with an F lower nibble", () => {
    const parsed = parseQuickEntry("0: out\n1: hLt\n2: 00h");
    expect(parsed.errors).toEqual([]);
    expect(parsed.ram.slice(0, 3)).toEqual([0xef, 0xff, 0x00]);
  });

  it("reports address and value range errors without throwing", () => {
    const result = parseQuickEntry("10: 1FFH\n0: UNKNOWN 1");
    expect(result.errors).toHaveLength(2);
  });
});
