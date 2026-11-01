import { describe, expect, it } from "vitest";
import { createInitialState, loadProgram, microStep, step } from "./cpu.js";
import { parseQuickEntry } from "./parser.js";
import { PRESETS } from "./presets.js";

function run(program, count) {
  let state = loadProgram(createInitialState(), program);
  for (let index = 0; index < count; index += 1) state = step(state);
  return state;
}

describe("SAP-1 CPU", () => {
  it("runs the sample program to 07H and halts", () => {
    const parsed = parseQuickEntry(PRESETS["25H + 05H - 23H = 07H"]);
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
});
