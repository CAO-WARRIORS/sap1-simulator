export const OPCODES = Object.freeze({
  LDA: 0x0,
  ADD: 0x1,
  SUB: 0x2,
  OUT: 0xe,
  HLT: 0xf,
});

export const MNEMONICS = Object.freeze({
  [OPCODES.LDA]: "LDA",
  [OPCODES.ADD]: "ADD",
  [OPCODES.SUB]: "SUB",
  [OPCODES.OUT]: "OUT",
  [OPCODES.HLT]: "HLT",
});

const CONTROL_SIGNALS = Object.freeze({
  1: ["Ep", "Lm"],
  2: ["Cp"],
  3: ["CE", "Li"],
});

const byte = (value) => value & 0xff;
const nibble = (value) => value & 0x0f;
const isByte = (value) =>
  Number.isInteger(value) && value >= 0 && value <= 0xff;

// Formula evaluation stays in the CPU module so the UI never duplicates arithmetic.
export const calculateFormula = (a, operation2, b, operation3, c) => {
  const apply = (left, operation, right) => {
    if (operation === "ADD") return left + right;
    if (operation === "SUB") return left - right;
    throw new RangeError(`Unsupported operation ${operation}.`);
  };
  return byte(apply(apply(a, operation2, b), operation3, c));
};

const initialState = () => ({
  pc: 0,
  mar: 0,
  ir: 0,
  a: 0,
  b: 0,
  output: 0,
  memory: Array(16).fill(0),
  tState: 1,
  halted: false,
  error: null,
  busValue: null,
  busSource: null,
  busDestination: null,
  activeSignals: [],
});

const opcodeOf = (state) => (state.ir >> 4) & 0x0f;
const operandOf = (state) => state.ir & 0x0f;

export class SAP1 {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = initialState();
    return this.snapshot();
  }

  loadProgram(memoryArray) {
    if (!Array.isArray(memoryArray) || memoryArray.length > 16) {
      throw new RangeError("Program must contain at most 16 byte values.");
    }
    if (!memoryArray.every(isByte)) {
      throw new RangeError(
        "Every program value must be an integer from 00H to FFH.",
      );
    }
    this.state = {
      ...initialState(),
      memory: [...memoryArray, ...Array(16 - memoryArray.length).fill(0)],
    };
    return this.snapshot();
  }

  snapshot() {
    return {
      ...this.state,
      memory: [...this.state.memory],
      activeSignals: [...this.state.activeSignals],
    };
  }

  stepTState() {
    if (this.state.halted || this.state.error) return this.snapshot();

    const state = this.state;
    const tState = state.tState;
    const operation = {
      busValue: null,
      busSource: null,
      busDestination: null,
      activeSignals: [],
    };
    let next = { ...state, ...operation };

    // Fetch cycle: T1 loads MAR, T2 increments PC, and T3 loads IR.
    if (tState === 1) {
      next = {
        ...next,
        mar: state.pc,
        tState: 2,
        busValue: state.pc,
        busSource: "PC",
        busDestination: "MAR",
        activeSignals: CONTROL_SIGNALS[1],
      };
    } else if (tState === 2) {
      next = {
        ...next,
        pc: nibble(state.pc + 1),
        tState: 3,
        activeSignals: CONTROL_SIGNALS[2],
      };
    } else if (tState === 3) {
      const instruction = state.memory[state.mar];
      next = {
        ...next,
        ir: instruction,
        tState: 4,
        busValue: instruction,
        busSource: "RAM",
        busDestination: "IR",
        activeSignals: CONTROL_SIGNALS[3],
      };
    } else {
      next = this.executeInstructionTState(state, next);
    }

    this.state = next;
    return this.snapshot();
  }

  executeInstructionTState(state, next) {
    const opcode = opcodeOf(state);
    const operand = operandOf(state);

    if (state.tState === 4) {
      if (opcode === OPCODES.HLT) {
        return { ...next, halted: true, activeSignals: ["HLT"] };
      }
      if (opcode === OPCODES.OUT) {
        return {
          ...next,
          output: state.a,
          tState: 5,
          busValue: state.a,
          busSource: "A",
          busDestination: "Output",
          activeSignals: ["Ea", "Lo"],
        };
      }
      if ([OPCODES.LDA, OPCODES.ADD, OPCODES.SUB].includes(opcode)) {
        // T4: the IR enables its operand onto the W-Bus while MAR loads it.
        return {
          ...next,
          mar: operand,
          tState: 5,
          busValue: operand,
          busSource: "IR",
          busDestination: "MAR",
          activeSignals: ["Ei", "Lm"],
        };
      }
      return {
        ...next,
        error: `Illegal opcode ${opcode.toString(2).padStart(4, "0")}`,
      };
    }

    if (state.tState === 5) {
      if (opcode === OPCODES.OUT) return { ...next, tState: 6 };
      if (opcode === OPCODES.LDA) {
        return {
          ...next,
          a: state.memory[state.mar],
          tState: 6,
          busValue: state.memory[state.mar],
          busSource: "RAM",
          busDestination: "A",
          activeSignals: ["CE", "La"],
        };
      }
      if (opcode === OPCODES.ADD || opcode === OPCODES.SUB) {
        return {
          ...next,
          b: state.memory[state.mar],
          tState: 6,
          busValue: state.memory[state.mar],
          busSource: "RAM",
          busDestination: "B",
          activeSignals: ["CE", "Lb"],
        };
      }
    }

    if (state.tState === 6) {
      if (opcode === OPCODES.ADD || opcode === OPCODES.SUB) {
        const result =
          opcode === OPCODES.SUB ? state.a - state.b : state.a + state.b;
        return {
          ...next,
          a: byte(result),
          tState: 1,
          busValue: byte(result),
          busSource: "Adder/Subtractor",
          busDestination: "A",
          activeSignals:
            opcode === OPCODES.SUB ? ["Eu", "La", "Su"] : ["Eu", "La"],
        };
      }
      if (opcode === OPCODES.LDA || opcode === OPCODES.OUT)
        return { ...next, tState: 1 };
    }

    return { ...next, error: `Unsupported T-state ${state.tState}` };
  }

  stepInstruction() {
    if (this.state.halted || this.state.error) return this.snapshot();
    do {
      this.stepTState();
    } while (
      !this.state.halted &&
      !this.state.error &&
      this.state.tState !== 1
    );
    return this.snapshot();
  }

  run(maxCycles = 1000) {
    if (!Number.isInteger(maxCycles) || maxCycles < 1) {
      throw new RangeError("maxCycles must be a positive integer.");
    }
    let cycles = 0;
    while (!this.state.halted && !this.state.error && cycles < maxCycles) {
      this.stepInstruction();
      cycles += 1;
    }
    if (!this.state.halted && !this.state.error) {
      this.state = {
        ...this.state,
        error: `Safety limit reached after ${maxCycles} instructions.`,
      };
    }
    return this.snapshot();
  }
}

export const createSAP1 = () => new SAP1();
