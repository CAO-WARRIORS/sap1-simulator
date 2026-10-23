import { CONTROL_SIGNALS, MNEMONICS, Opcode } from "./constants.js";
import { toByte, toNibble } from "./format.js";

/** @typedef {number[]} Memory */
/** @typedef {{ pc:number, mar:number, ir:number, a:number, b:number, output:number, memory:Memory, tState:number, status:string, error:string|null, activeSignals:string[], busSource:string|null, busDestination:string|null, busValue:number|null, carry:boolean, changedRegisters:string[], log:string[], instructionCount:number }} Sap1State */
/** @typedef {{ state:Sap1State, tState:number, activeSignals:string[], busSource:string|null, busDestination:string|null, busValue:number|null, changedRegisters:string[], logEntry:string }} MicroStepResult */

const emptyMemory = () => Array.from({ length: 16 }, () => 0);
const assertState = (state) => {
  if (!state || !Array.isArray(state.memory) || state.memory.length !== 16)
    throw new TypeError("SAP-1 state must contain sixteen memory locations.");
};
const withChanges = (
  state,
  patch,
  changedRegisters,
  logEntry,
  signals = [],
  source = null,
  destination = null,
  busValue = null,
) => {
  const next = {
    ...state,
    ...patch,
    activeSignals: signals,
    busSource: source,
    busDestination: destination,
    busValue,
    changedRegisters,
    log: [...state.log, logEntry],
  };
  return {
    state: next,
    tState: next.tState,
    activeSignals: signals,
    busSource: source,
    busDestination: destination,
    busValue,
    changedRegisters,
    logEntry,
  };
};

/** @returns {Sap1State} Creates a cleared SAP-1 with sixteen zeroed memory locations. */
export function createInitialState() {
  return {
    pc: 0,
    mar: 0,
    ir: 0,
    a: 0,
    b: 0,
    output: 0,
    memory: emptyMemory(),
    tState: 1,
    status: "Ready",
    error: null,
    activeSignals: [],
    busSource: null,
    busDestination: null,
    busValue: null,
    carry: false,
    changedRegisters: [],
    log: [],
    instructionCount: 0,
  };
}

/** @param {Sap1State} state @param {Memory} memory @returns {Sap1State} Loads a validated 16-byte image and clears execution state. */
export function loadProgram(state, memory) {
  assertState(state);
  if (
    !Array.isArray(memory) ||
    memory.length > 16 ||
    !memory.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 0xff,
    )
  )
    throw new RangeError(
      "Program memory must contain up to sixteen byte values.",
    );
  return {
    ...createInitialState(),
    memory: memory.slice(0, 16).map(toByte).concat(emptyMemory()).slice(0, 16),
  };
}

const opcode = (state) => (state.ir >> 4) & 0x0f;
const operand = (state) => state.ir & 0x0f;
export const mnemonic = (instruction) =>
  MNEMONICS[(instruction >> 4) & 0x0f] ?? "???";

/** @param {Sap1State} state @returns {MicroStepResult} Executes exactly one T-state and returns narration metadata. */
export function microStep(state) {
  assertState(state);
  if (state.status === "Halted" || state.status === "Error")
    return withChanges(state, {}, [], "Clock stopped.");
  if (state.tState === 1)
    return withChanges(
      state,
      { mar: state.pc, status: "Running", tState: 2 },
      ["MAR"],
      `T1: MAR <- PC (${state.pc.toString(16).toUpperCase()}H)`,
      ["Ep", "Lm"],
      "PC",
      "MAR",
      state.pc,
    );
  if (state.tState === 2)
    return withChanges(
      state,
      { pc: toNibble(state.pc + 1), tState: 3 },
      ["PC"],
      `T2: PC <- PC + 1 (${toNibble(state.pc + 1)
        .toString(16)
        .toUpperCase()}H)`,
      ["Cp"],
    );
  if (state.tState === 3)
    return withChanges(
      state,
      { ir: state.memory[state.mar], tState: 4 },
      ["IR"],
      `T3: IR <- RAM[${state.mar.toString(16).toUpperCase()}H] (${state.memory[state.mar].toString(16).toUpperCase().padStart(2, "0")}H)`,
      ["CE", "Li"],
      "RAM",
      "IR",
      state.memory[state.mar],
    );
  const op = opcode(state);
  if (state.tState === 4) {
    if (op === Opcode.HLT)
      return withChanges(
        state,
        { status: "Halted" },
        [],
        "T4: HLT - clock stopped",
        ["HLT"],
      );
    if (op === Opcode.OUT)
      return withChanges(
        state,
        { tState: 5, output: state.a },
        ["OUT"],
        `T4: OUT <- A (${state.a.toString(16).toUpperCase().padStart(2, "0")}H)`,
        ["Ea", "Lo"],
        "A",
        "OUT",
        state.a,
      );
    if ([Opcode.LDA, Opcode.ADD, Opcode.SUB].includes(op))
      return withChanges(
        state,
        { mar: operand(state), tState: 5 },
        ["MAR"],
        `T4: MAR <- IR operand (${operand(state).toString(16).toUpperCase()}H)`,
        ["Ei", "Lm"],
        "IR",
        "MAR",
        operand(state),
      );
    return withChanges(
      state,
      {
        status: "Error",
        error: `Illegal opcode ${op.toString(2).padStart(4, "0")}`,
      },
      [],
      `T4: ERROR - illegal opcode ${op.toString(2).padStart(4, "0")}`,
    );
  }
  if (state.tState === 5) {
    if (op === Opcode.OUT)
      return withChanges(state, { tState: 6 }, [], "T5: No operation");
    if (op === Opcode.LDA)
      return withChanges(
        state,
        { a: state.memory[state.mar], tState: 6 },
        ["A"],
        `T5: A <- RAM[${state.mar.toString(16).toUpperCase()}H] (${state.memory[state.mar].toString(16).toUpperCase().padStart(2, "0")}H)`,
        ["CE", "La"],
        "RAM",
        "A",
        state.memory[state.mar],
      );
    if (op === Opcode.ADD || op === Opcode.SUB)
      return withChanges(
        state,
        { b: state.memory[state.mar], tState: 6 },
        ["B"],
        `T5: B <- RAM[${state.mar.toString(16).toUpperCase()}H] (${state.memory[state.mar].toString(16).toUpperCase().padStart(2, "0")}H)`,
        ["CE", "Lb"],
        "RAM",
        "B",
        state.memory[state.mar],
      );
  }
  if (state.tState === 6) {
    if (op === Opcode.ADD || op === Opcode.SUB) {
      const raw =
        op === Opcode.SUB ? state.a + (state.b ^ 0xff) + 1 : state.a + state.b;
      return withChanges(
        state,
        {
          a: toByte(raw),
          carry: raw > 0xff,
          tState: 1,
          instructionCount: state.instructionCount + 1,
        },
        ["A"],
        `T6: A <- ${op === Opcode.SUB ? "A - B" : "A + B"} = ${toByte(raw).toString(16).toUpperCase().padStart(2, "0")}H`,
        op === Opcode.SUB ? ["Eu", "La", "Su"] : ["Eu", "La"],
        "SUM",
        "A",
        toByte(raw),
      );
    }
    if (op === Opcode.LDA || op === Opcode.OUT)
      return withChanges(
        state,
        { tState: 1, instructionCount: state.instructionCount + 1 },
        [],
        "T6: No operation",
      );
  }
  return withChanges(
    state,
    { status: "Error", error: `Unsupported opcode ${op}` },
    [],
    "Execution error.",
  );
}

/** @param {Sap1State} state @returns {Sap1State} Completes one instruction. */
export function stepInstruction(state) {
  let next = state;
  do next = microStep(next).state;
  while (next.status === "Running" && next.tState !== 1);
  return next;
}

/** @param {Sap1State} state @param {number} maxCycles @returns {Sap1State} Runs whole instructions up to a safety limit. */
export function runToHalt(state, maxCycles = 1000) {
  if (!Number.isInteger(maxCycles) || maxCycles < 1)
    throw new RangeError("maxCycles must be a positive integer.");
  let next = state;
  for (
    let index = 0;
    index < maxCycles && next.status !== "Halted" && next.status !== "Error";
    index += 1
  )
    next = stepInstruction(next);
  return next.status === "Running"
    ? {
        ...next,
        status: "Error",
        error: `Safety limit reached after ${maxCycles} instructions.`,
      }
    : next;
}

/** @returns {Sap1State} Returns a cleared SAP-1 state. */
export function reset() {
  return createInitialState();
}
export const allSignals = CONTROL_SIGNALS;
