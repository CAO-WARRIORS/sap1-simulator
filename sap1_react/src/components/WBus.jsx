import { binary8, hex8 } from "../engine/format.js";

/** W-Bus block: narrates the active source-to-destination eight-bit transfer. */
export default function WBus({
  source = null,
  destination = null,
  value = null,
  active = value !== null,
}) {
  const isMoving = active && source && destination && value !== null;
  const transfer = isMoving ? `${source} -> W-BUS -> ${destination}` : "idle";
  return (
    <section
      className={`panel wbus-panel ${isMoving ? "wbus-panel--active" : ""}`}
    >
      <div className="section-heading">
        <span>06</span>
        <h2>W-Bus</h2>
      </div>
      <div className="wbus-panel__line" aria-hidden="true"></div>
      <strong>{transfer}</strong>
      <span>{isMoving ? `${binary8(value)} / ${hex8(value)}` : "idle"}</span>
    </section>
  );
}
