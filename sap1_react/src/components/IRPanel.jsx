import { binary4, binary8, hex4, hex8 } from "../engine/format.js";
import { MNEMONICS } from "../engine/constants.js";

/** Instruction Register: displays the opcode and operand nibbles separately. */
export default function IRPanel({ value = 0, changed = false }) {
  const opcode = (value >> 4) & 0x0f;
  const operand = value & 0x0f;
  const mnemonic = MNEMONICS[opcode] || "???";
  const decoded = ["LDA", "ADD", "SUB"].includes(mnemonic)
    ? `${mnemonic} ${hex4(operand)}`
    : mnemonic;

  return (
    <article
      className={`register ir-panel ${changed ? "register--changed" : ""}`}
    >
      <div className="register__name">IR / Instruction Register</div>
      <strong>{binary8(value)}</strong>
      <div className="ir-panel__nibbles">
        <span>OP {binary4(opcode)}</span>
        <span>ARG {binary4(operand)}</span>
      </div>
      <span>
        {hex8(value)} / {decoded}
      </span>
    </article>
  );
}
