import { binary8, hex8 } from "../engine/format.js";

/** Output register indicator: one LED for each output bit, bit 7 through bit 0. */
export default function OutputLEDs({ value = 0 }) {
  return (
    <section className="panel output-panel">
      <div className="section-heading">
        <span>10</span>
        <h2>Binary Output LEDs</h2>
      </div>
      <div className="led-row">
        {binary8(value)
          .split("")
          .map((bit, index) => (
            <div className="led-bit" key={`output-bit-${index}`}>
              <span
                className={`led ${bit === "1" ? "led--on" : ""}`}
                aria-label={`bit ${7 - index} ${bit === "1" ? "on" : "off"}`}
              ></span>
              <small>bit {7 - index}</small>
            </div>
          ))}
      </div>
      <div className="output-readout">
        <strong>{hex8(value)}</strong>
        <span>{binary8(value)}</span>
      </div>
    </section>
  );
}
