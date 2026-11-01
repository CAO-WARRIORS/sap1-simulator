import { decode } from "./instructions.js";
import { mask4, mask8 } from "./utils.js";

const emptyBus = () => ({ value: 0, source: "", destination: "" });
export function createInitialState() {
  return {
    ram: Array(16).fill(0),
    pc: 0,
    mar: 0,
    ir: 0,
    a: 0,
    b: 0,
    alu: { su: 0, result: 0 },
    out: 0,
    bus: emptyBus(),
    tState: 0,
    halted: false,
    running: false,
    loaded: false,
    cycleCount: 0,
    controlWord: {},
    log: [],
    lastRead: null,
    executed: [],
    status: "Load a program to begin.",
  };
}
export function loadProgram(state, ram) {
  return {
    ...createInitialState(),
    ram: ram.map(mask8),
    loaded: true,
    status: "Program loaded. Ready to fetch.",
  };
}
export function reset(state) {
  return {
    ...createInitialState(),
    ram: [...state.ram],
    loaded: state.loaded,
    status: "Registers reset. Program retained.",
  };
}
function bus(state, value, source, destination) {
  return { ...state, bus: { value: mask8(value), source, destination } };
}

export function microStep(state) {
  if (!state.loaded || state.halted) return state;
  const nextT = state.tState === 0 ? 1 : state.tState + 1;
  let next = { ...state, tState: nextT, controlWord: {}, lastRead: null };
  const activeInstruction = nextT === 3 ? state.ram[state.mar] : state.ir;
  const { operand, mnemonic } = decode(activeInstruction);
  if (nextT === 1)
    next = bus(
      {
        ...next,
        controlWord: { Ep: 1, Lm: 1 },
        mar: state.pc,
        status: "T1: The Program Counter sends its address to the MAR.",
      },
      state.pc,
      "PC",
      "MAR",
    );
  if (nextT === 2)
    next = {
      ...next,
      controlWord: { Cp: 1 },
      pc: mask4(state.pc + 1),
      status: "T2: The Program Counter advances to the next address.",
    };
  if (nextT === 3)
    next = bus(
      {
        ...next,
        controlWord: { CE: 1, Li: 1 },
        ir: activeInstruction,
        lastRead: state.mar,
        status: `T3: RAM address ${state.mar.toString(16).toUpperCase()}H loads the Instruction Register.`,
      },
      state.ram[state.mar],
      "RAM",
      "IR",
    );
  if (nextT === 4) {
    if (mnemonic === "HLT")
      return {
        ...next,
        halted: true,
        tState: 4,
        status: "HLT: The clock has stopped.",
        log: [
          `T4 HLT at ${state.mar.toString(16).toUpperCase()}H`,
          ...state.log,
        ].slice(0, 20),
      };
    if (mnemonic === "OUT")
      next = bus(
        {
          ...next,
          controlWord: { Ea: 1, Lo: 1 },
          out: state.a,
          status: "T4: The Accumulator sends its value to the Output Register.",
        },
        state.a,
        "A",
        "OUT",
      );
    else
      next = bus(
        {
          ...next,
          controlWord: { Ei: 1, Lm: 1 },
          mar: operand,
          status: `T4: The Instruction Register sends operand ${operand.toString(16).toUpperCase()}H to the MAR.`,
        },
        operand,
        "IR",
        "MAR",
      );
  }
  if (nextT === 5 && ["LDA", "ADD", "SUB"].includes(mnemonic)) {
    const value = state.ram[state.mar];
    next = bus(
      {
        ...next,
        controlWord: { CE: 1, [mnemonic === "LDA" ? "La" : "Lb"]: 1 },
        lastRead: state.mar,
        ...(mnemonic === "LDA" ? { a: value } : { b: value }),
        status: `T5: RAM address ${state.mar.toString(16).toUpperCase()}H loads ${mnemonic === "LDA" ? "the Accumulator" : "the B Register"}.`,
      },
      value,
      "RAM",
      mnemonic === "LDA" ? "A" : "B",
    );
  }
  if (nextT === 6 && ["ADD", "SUB"].includes(mnemonic)) {
    const result =
      mnemonic === "SUB" ? mask8(state.a - state.b) : mask8(state.a + state.b);
    next = bus(
      {
        ...next,
        controlWord: { Eu: 1, La: 1, ...(mnemonic === "SUB" ? { Su: 1 } : {}) },
        alu: { su: mnemonic === "SUB" ? 1 : 0, result },
        a: result,
        status: `T6: The ALU ${mnemonic === "SUB" ? "subtracts B from A" : "adds A and B"} and returns the result to A.`,
      },
      result,
      "ALU",
      "A",
    );
  }
  if (nextT === 6) {
    const executed = state.executed.includes(state.mar)
      ? state.executed
      : [...state.executed, state.mar];
    return {
      ...next,
      tState: 0,
      cycleCount: state.cycleCount + 1,
      executed,
      log: [`T${nextT} ${next.status}`, ...state.log].slice(0, 20),
    };
  }
  return {
    ...next,
    log: [`T${nextT} ${next.status}`, ...state.log].slice(0, 20),
  };
}
export function step(state) {
  let next = state;
  for (let count = 0; count < 6 && !next.halted; count += 1)
    next = microStep(next);
  return next;
}
