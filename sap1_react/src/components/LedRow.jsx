import { binary8, hex8 } from "../engine/format.js";

/** @param {{ value:number }} props */
export default function LedRow({ value }) {
  const bits = binary8(value).split("");
  return (
    <section className="panel output-panel">
      <div className="section-heading">
        <span>02</span>
        <h2>Output register</h2>
      </div>
      <div className="led-row">
        {bits.map((bit, index) => (
          <div className="led-bit" key={`bit-${index}`}>
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
        <span>{value} decimal</span>
      </div>
    </section>
  );
}
