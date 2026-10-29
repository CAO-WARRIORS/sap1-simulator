import { CONTROL_SIGNALS, MNEMONICS } from "../engine/constants.js";

/** Controller-sequencer block: exposes the current T-state and decoded signals. */
export default function ControllerPanel({
  tState = 1,
  instruction = 0,
  activeSignals = [],
  halted = false,
}) {
  const mnemonic = MNEMONICS[(instruction >> 4) & 0x0f] || "???";
  const operand = instruction & 0x0f;

  return (
    <section className="panel controller-panel">
      <div className="section-heading">
        <span>05</span>
        <h2>Controller-Sequencer</h2>
      </div>
      <div className="state-strip">
        <span>
          T-state <b>T{tState}</b>
        </span>
        <span>
          Instruction{" "}
          <b>
            {mnemonic}{" "}
            {mnemonic === "LDA" || mnemonic === "ADD" || mnemonic === "SUB"
              ? operand.toString(16).toUpperCase() + "H"
              : ""}
          </b>
        </span>
        {halted && (
          <span className="flag">
            <b>HALTED</b>
          </span>
        )}
      </div>
      {/* Ei is the IR enable signal used during the operand-to-MAR transfer. */}
      <div className="signal-grid">
        {CONTROL_SIGNALS.map((signal) => (
          <span
            className={`signal ${activeSignals.includes(signal) ? "signal--active" : ""}`}
            key={signal}
          >
            <i aria-hidden="true"></i>
            {signal}
          </span>
        ))}
      </div>
    </section>
  );
}
