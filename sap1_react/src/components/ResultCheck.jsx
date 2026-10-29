import { binary8, hex8 } from "../engine/format.js";

const spacedBinary = (value) => binary8(value).replace(/(.{4})/, "$1 ");

/** @param {{ expected:number|null, actual:number, status:string }} props */
export default function ResultCheck({ expected, actual, status }) {
  if (expected === null)
    return (
      <div className="result-check">
        Custom program result: <strong>{hex8(actual)}</strong>
      </div>
    );
  const pass = expected === actual && status === "Halted";
  // ResultCheck formats the CPU result; formula arithmetic belongs to core/cpu.js.
  return (
    <div className={`result-check ${pass ? "result-check--pass" : ""}`}>
      <span>
        Expected {hex8(expected)} ({spacedBinary(expected)})
      </span>
      <strong>Actual {hex8(actual)}</strong>
      <b>{pass ? "PASS" : status === "Halted" ? "FAIL" : "PENDING"}</b>
    </div>
  );
}
