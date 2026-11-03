import { decode } from "./instructions.js";
import {
  DEFAULT_CLOCK_SPEED,
  FETCH_OPERATIONS,
  IDLE_T_STATE,
  MICRO_OPERATIONS,
  RAM_SIZE,
  T_STATE_COUNT,
  T_STATES,
} from "./config.js";
import { mask4, mask8 } from "./utils.js";

const emptyBus = () => ({ value: 0, source: "", destination: "" });
export function createInitialState() {
  return {
    ram: Array(RAM_SIZE).fill(0),
    entries: Array(RAM_SIZE).fill(null),
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
    speed: DEFAULT_CLOCK_SPEED,
  };
}
export function loadProgram(state, ram, entries = Array(RAM_SIZE).fill(null)) {
  return {
    ...createInitialState(),
    ram: ram.map(mask8),
    entries: [...entries],
    loaded: true,
    status: "Program loaded. Ready to fetch.",
  };
}
export function reset(state) {
  return {
    ...createInitialState(),
    ram: [...state.ram],
    entries: [...state.entries],
    loaded: state.loaded,
    status: "Registers reset. Program retained.",
  };
}
function bus(state, value, source, destination) {
  return { ...state, bus: { value: mask8(value), source, destination } };
}

export function microStep(state) {
  if (!state.loaded || state.halted) return state;
  const nextT =
    state.tState === IDLE_T_STATE || state.tState === T_STATE_COUNT
      ? 1
      : state.tState + 1;
  let next = {
    ...state,
    tState: nextT,
    controlWord: {},
    bus: emptyBus(),
    lastRead: null,
  };
  const activeInstruction =
    nextT === T_STATES.T3 ? state.ram[state.mar] : state.ir;
  const { operand, mnemonic } = decode(activeInstruction);
  const operation =
    nextT <= T_STATES.T3
      ? FETCH_OPERATIONS[nextT]
      : MICRO_OPERATIONS[mnemonic]?.[nextT] || { signals: [], status: "NOP" };
  const controlWord = Object.fromEntries(
    operation.signals.map((signal) => [signal, 1]),
  );
  const withOperation = (current) => ({
    ...next,
    ...current,
    controlWord,
  });
  if (nextT === T_STATES.T1)
    next = bus(
      withOperation({
        mar: state.pc,
        status: "T1: The Program Counter sends its address to the MAR.",
      }),
      state.pc,
      operation.source,
      operation.destination,
    );
  if (nextT === T_STATES.T2)
    next = withOperation({
      ...next,
      pc: mask4(state.pc + 1),
      status: "T2: The Program Counter advances to the next address.",
    });
  if (nextT === T_STATES.T3)
    next = bus(
      withOperation({
        ir: activeInstruction,
        lastRead: state.mar,
        status: `T3: RAM address ${state.mar.toString(16).toUpperCase()}H loads the Instruction Register.`,
      }),
      state.ram[state.mar],
      operation.source,
      operation.destination,
    );
  if (nextT === T_STATES.T4) {
    if (mnemonic === "HLT")
      return {
        ...withOperation(next),
        halted: true,
        tState: T_STATES.T4,
        status: "HLT: The clock has stopped.",
        log: [
          `T4 HLT at ${state.mar.toString(16).toUpperCase()}H`,
          ...state.log,
        ].slice(0, 20),
      };
    if (mnemonic === "OUT")
      next = bus(
        withOperation({
          out: state.a,
          status: "T4: The Accumulator sends its value to the Output Register.",
        }),
        state.a,
        operation.source,
        operation.destination,
      );
    else
      next = bus(
        withOperation({
          mar: operand,
          status: `T4: The Instruction Register sends operand ${operand.toString(16).toUpperCase()}H to the MAR.`,
        }),
        operand,
        operation.source,
        operation.destination,
      );
  }
  if (nextT === T_STATES.T5 && ["LDA", "ADD", "SUB"].includes(mnemonic)) {
    const value = state.ram[state.mar];
    next = bus(
      withOperation({
        lastRead: state.mar,
        ...(mnemonic === "LDA" ? { a: value } : { b: value }),
        status: `T5: RAM address ${state.mar.toString(16).toUpperCase()}H loads ${mnemonic === "LDA" ? "the Accumulator" : "the B Register"}.`,
      }),
      value,
      operation.source,
      operation.destination,
    );
  }
  if (nextT === T_STATES.T5 && operation.status === "NOP")
    next = { ...next, status: "T5: No operation (NOP)." };
  if (nextT === T_STATES.T6 && ["ADD", "SUB"].includes(mnemonic)) {
    const result =
      mnemonic === "SUB" ? mask8(state.a - state.b) : mask8(state.a + state.b);
    next = bus(
      withOperation({
        alu: { su: mnemonic === "SUB" ? 1 : 0, result },
        a: result,
        status: `T6: The ALU ${mnemonic === "SUB" ? "subtracts B from A" : "adds A and B"} and returns the result to A.`,
      }),
      result,
      operation.source,
      operation.destination,
    );
  }
  if (nextT === T_STATES.T6 && operation.status === "NOP")
    next = { ...next, status: "T6: No operation (NOP)." };
  if (nextT === T_STATES.T6) {
    const executed = state.executed.includes(state.mar)
      ? state.executed
      : [...state.executed, state.mar];
    return {
      ...next,
      tState: T_STATES.T6,
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
  for (let count = 0; count < T_STATE_COUNT && !next.halted; count += 1)
    next = microStep(next);
  return next;
}
