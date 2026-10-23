import { hex8 } from "../engine/format.js";

/** @param {{ source:string|null, destination:string|null, value:number|null }} props */
export default function BusDiagram({ source, destination, value }) {
  return (
    <section className="panel bus-panel">
      <div className="section-heading">
        <span>05</span>
        <h2>W-Bus activity</h2>
      </div>

      <svg
        className="bus-diagram"
        viewBox="0 0 720 190"
        role="img"
        aria-label="SAP-1 bus diagram"
      >
        <rect
          className="bus-block"
          x="22"
          y="55"
          width="125"
          height="70"
          rx="4"
        />
        <text x="84" y="96">
          {source || "SOURCE"}
        </text>
        <rect
          className="bus-line"
          x="180"
          y="76"
          width="360"
          height="28"
          rx="14"
        />
        <text className="bus-label" x="360" y="95">
          8-BIT W-BUS
        </text>
        <polygon className="bus-arrow" points="540,76 565,90 540,104" />
        <rect
          className="bus-block"
          x="575"
          y="55"
          width="125"
          height="70"
          rx="4"
        />
        <text x="637" y="96">
          {destination || "DESTINATION"}
        </text>
        <text className="bus-value" x="360" y="155">
          {value === null ? "--" : hex8(value)}
        </text>
      </svg>
    </section>
  );
}
