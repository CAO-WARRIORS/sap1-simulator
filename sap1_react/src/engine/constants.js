export const Opcode = Object.freeze({
  LDA: 0x0,
  ADD: 0x1,
  SUB: 0x2,
  OUT: 0xe,
  HLT: 0xf,
});

export const CONTROL_SIGNALS = Object.freeze([
  "Ep",
  "Lm",
  "CE",
  "Li",
  "Ei",
  "La",
  "Ea",
  "Su",
  "Eu",
  "Lb",
  "Lo",
  "Cp",
  "HLT",
]);

export const MNEMONICS = Object.freeze({
  [Opcode.LDA]: "LDA",
  [Opcode.ADD]: "ADD",
  [Opcode.SUB]: "SUB",
  [Opcode.OUT]: "OUT",
  [Opcode.HLT]: "HLT",
});
