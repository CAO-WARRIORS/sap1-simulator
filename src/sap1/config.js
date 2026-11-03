export const RAM_SIZE = 16;
export const ADDRESS_BITS = 4;
export const NIBBLE_BITS = 4;
export const DATA_BITS = 8;
export const T_STATE_COUNT = 6;
export const FETCH_T_STATE_COUNT = 3;
export const IDLE_T_STATE = 0;
export const T_STATES = Object.freeze({
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
  T5: 5,
  T6: 6,
});
export const DEFAULT_CLOCK_SPEED = 700;
export const MIN_CLOCK_SPEED = 100;
export const MAX_CLOCK_SPEED = 1500;
export const CLOCK_SPEED_STEP = 50;
export const EVALUATION_STEP_LIMIT = RAM_SIZE * 64;
export const MAX_CYCLES = 500;

export const OPCODES = Object.freeze({
  LDA: 0x0,
  ADD: 0x1,
  SUB: 0x2,
  OUT: 0xe,
  HLT: 0xf,
});
export const MNEMONICS = Object.freeze(
  Object.fromEntries(
    Object.entries(OPCODES).map(([name, code]) => [code, name]),
  ),
);
export const SIGNALS = Object.freeze([
  "Ep",
  "Lm",
  "CE",
  "Li",
  "Ei",
  "La",
  "Ea",
  "Eu",
  "Su",
  "Lb",
  "Lo",
  "Cp",
]);
export const NO_OPERAND_MNEMONICS = Object.freeze(["OUT", "HLT"]);
export const NO_OPERAND_VALUE = 0xf;

export const FETCH_OPERATIONS = Object.freeze({
  [T_STATES.T1]: { signals: ["Ep", "Lm"], source: "PC", destination: "MAR" },
  [T_STATES.T2]: { signals: ["Cp"] },
  [T_STATES.T3]: { signals: ["CE", "Li"], source: "RAM", destination: "IR" },
});
export const MICRO_OPERATIONS = Object.freeze({
  LDA: {
    [T_STATES.T4]: { signals: ["Ei", "Lm"], source: "IR", destination: "MAR" },
    [T_STATES.T5]: { signals: ["CE", "La"], source: "RAM", destination: "A" },
    [T_STATES.T6]: { signals: [], status: "NOP" },
  },
  ADD: {
    [T_STATES.T4]: { signals: ["Ei", "Lm"], source: "IR", destination: "MAR" },
    [T_STATES.T5]: { signals: ["CE", "Lb"], source: "RAM", destination: "B" },
    [T_STATES.T6]: { signals: ["Eu", "La"], source: "ALU", destination: "A" },
  },
  SUB: {
    [T_STATES.T4]: { signals: ["Ei", "Lm"], source: "IR", destination: "MAR" },
    [T_STATES.T5]: { signals: ["CE", "Lb"], source: "RAM", destination: "B" },
    [T_STATES.T6]: {
      signals: ["Eu", "La", "Su"],
      source: "ALU",
      destination: "A",
    },
  },
  OUT: {
    [T_STATES.T4]: { signals: ["Ea", "Lo"], source: "A", destination: "OUT" },
    [T_STATES.T5]: { signals: [], status: "NOP" },
    [T_STATES.T6]: { signals: [], status: "NOP" },
  },
  HLT: {
    [T_STATES.T4]: { signals: [], halt: true },
  },
});

export function encodeInstruction(mnemonic, operand = NO_OPERAND_VALUE) {
  return (OPCODES[mnemonic] << ADDRESS_BITS) | operand;
}
