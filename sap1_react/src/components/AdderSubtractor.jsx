import { binary8, hex8 } from "../engine/format.js";

/** Adder/subtractor block: displays its eight-bit result and arithmetic mode. */
export default function AdderSubtractor({
  value = 0,
  mode = "ADD",
  enabled = false,
}) {
  const subtracting = mode.toUpperCase() === "SUB";
  return (
    <section
      className={`panel arithmetic-panel ${enabled ? "arithmetic-panel--active" : ""}`}
    >
      <div className="section-heading">
        <span>07</span>
        <h2>Adder / Subtractor</h2>
      </div>
      <div className="arithmetic-panel__mode">
        MODE <b>{subtracting ? "SUB" : "ADD"}</b>
      </div>
      <strong className="arithmetic-panel__binary">{binary8(value)}</strong>
      <span className="arithmetic-panel__hex">{hex8(value)}</span>
    </section>
  );
}
