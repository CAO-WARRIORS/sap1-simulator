import { allSignals } from "../engine/sap1.js";

/** @param {{ activeSignals:string[] }} props */
export default function ControlSignals({ activeSignals }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <span>04</span>
        <h2>Control signals</h2>
      </div>
      <div className="signal-grid">
        {allSignals.map((signal) => (
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
