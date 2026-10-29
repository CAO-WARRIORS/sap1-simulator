import { describe, expect, it } from "vitest";
import { calculateFormula, OPCODES, SAP1 } from "../cpu.js";

const instruction = (opcode, operand = 0xf) => (opcode << 4) | operand;

describe("SAP-1 core CPU", () => {
  // Formula variants are verified through the real instruction cycle and output register.
  it.each([
    [0x25, "ADD", 0x05, "SUB", 0x23, 0x07],
    [0x10, "ADD", 0x20, "ADD", 0x30, 0x60],
    [0x50, "SUB", 0x18, "SUB", 0x08, 0x30],
    [0x05, "ADD", 0x00, "SUB", 0x23, 0xe2],
    [0xff, "ADD", 0x01, "ADD", 0x00, 0x00],
  ])(
    "runs %s %s %s %s %s to %s",
    (a, operation2, b, operation3, c, expected) => {
      const cpu = new SAP1();
      cpu.loadProgram([
        instruction(OPCODES.LDA, 0x9),
        instruction(operation2 === "ADD" ? OPCODES.ADD : OPCODES.SUB, 0xa),
        instruction(operation3 === "ADD" ? OPCODES.ADD : OPCODES.SUB, 0xb),
        instruction(OPCODES.OUT),
        instruction(OPCODES.HLT),
        0,
        0,
        0,
        0,
        a,
        b,
        c,
      ]);

      expect(cpu.run().output).toBe(expected);
      expect(calculateFormula(a, operation2, b, operation3, c)).toBe(expected);
    },
  );

  // Every instruction must expose the exact controller signals for each T-state.
  it.each([
    [
      "LDA",
      OPCODES.LDA,
      [["Ep", "Lm"], ["Cp"], ["CE", "Li"], ["Ei", "Lm"], ["CE", "La"], []],
    ],
    [
      "ADD",
      OPCODES.ADD,
      [
        ["Ep", "Lm"],
        ["Cp"],
        ["CE", "Li"],
        ["Ei", "Lm"],
        ["CE", "Lb"],
        ["Eu", "La"],
      ],
    ],
    [
      "SUB",
      OPCODES.SUB,
      [
        ["Ep", "Lm"],
        ["Cp"],
        ["CE", "Li"],
        ["Ei", "Lm"],
        ["CE", "Lb"],
        ["Eu", "La", "Su"],
      ],
    ],
    [
      "OUT",
      OPCODES.OUT,
      [["Ep", "Lm"], ["Cp"], ["CE", "Li"], ["Ea", "Lo"], [], []],
    ],
  ])(
    "exposes signals for %s across T1-T6",
    (_name, opcode, expectedSignals) => {
      const cpu = new SAP1();
      cpu.loadProgram([instruction(opcode, 0x9), ...Array(8).fill(0), 0x7a]);

      const actualSignals = [];
      for (let index = 0; index < 6; index += 1) {
        actualSignals.push(cpu.stepTState().activeSignals);
      }

      expect(actualSignals).toEqual(expectedSignals);
    },
  );

  it("uses the zero-extended operand on the IR-to-MAR bus transfer", () => {
    const cpu = new SAP1();
    cpu.loadProgram([instruction(OPCODES.LDA, 0xa)]);
    cpu.stepTState();
    cpu.stepTState();
    cpu.stepTState();

    const state = cpu.stepTState();

    expect(state.busValue).toBe(0x0a);
    expect(state.busSource).toBe("IR");
    expect(state.busDestination).toBe("MAR");
    expect(state.activeSignals).toEqual(["Ei", "Lm"]);
  });

  it("activates HLT when the halt instruction is decoded", () => {
    const cpu = new SAP1();
    cpu.loadProgram([instruction(OPCODES.HLT)]);
    cpu.stepTState();
    cpu.stepTState();
    cpu.stepTState();

    const state = cpu.stepTState();

    expect(state.halted).toBe(true);
    expect(state.activeSignals).toEqual(["HLT"]);
  });

  it("computes the reference sample and halts", () => {
    const cpu = new SAP1();
    cpu.loadProgram([
      instruction(OPCODES.LDA, 0x9),
      instruction(OPCODES.ADD, 0xa),
      instruction(OPCODES.SUB, 0xb),
      instruction(OPCODES.OUT),
      instruction(OPCODES.HLT),
      0,
      0,
      0,
      0,
      0x25,
      0x05,
      0x23,
    ]);

    const state = cpu.run();

    expect(state.output).toBe(0x07);
    expect(state.a).toBe(0x07);
    expect(state.halted).toBe(true);
    expect(state.error).toBeNull();
  });

  // Automatic execution must expose all 28 micro-steps before sample HLT.
  it("reaches sample HLT after exactly 28 T-states", () => {
    const cpu = new SAP1();
    cpu.loadProgram([
      instruction(OPCODES.LDA, 0x9),
      instruction(OPCODES.ADD, 0xa),
      instruction(OPCODES.SUB, 0xb),
      instruction(OPCODES.OUT),
      instruction(OPCODES.HLT),
      0,
      0,
      0,
      0,
      0x25,
      0x05,
      0x23,
    ]);

    let tStates = 0;
    while (!cpu.snapshot().halted) {
      cpu.stepTState();
      tStates += 1;
    }

    expect(tStates).toBe(28);
    expect(cpu.snapshot().output).toBe(0x07);
  });

  it("returns bus metadata for each micro-step", () => {
    const cpu = new SAP1();
    cpu.loadProgram([instruction(OPCODES.LDA, 0x9), ...Array(8).fill(0), 0x7a]);

    const state = cpu.stepTState();

    expect(state.tState).toBe(2);
    expect(state.busValue).toBe(0);
    expect(state.busSource).toBe("PC");
    expect(state.busDestination).toBe("MAR");
    expect(state.activeSignals).toEqual(["Ep", "Lm"]);
  });

  it("wraps subtraction to eight bits", () => {
    const cpu = new SAP1();
    cpu.loadProgram([
      instruction(OPCODES.LDA, 0x9),
      instruction(OPCODES.SUB, 0xa),
      instruction(OPCODES.OUT),
      instruction(OPCODES.HLT),
      ...Array(5).fill(0),
      0x05,
      0x23,
    ]);

    expect(cpu.run().output).toBe(0xe2);
  });
});
