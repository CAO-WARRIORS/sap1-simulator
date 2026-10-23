import { hex8 } from "../engine/format.js";

/** @param {{ expected:number|null, actual:number, status:string }} props */
export default function ResultCheck({ expected, actual, status }) {
  if (expected === null)
    return (
      <div className="result-check">
        Custom program result: <strong>{hex8(actual)}</strong>
      </div>
    );
  const pass = expected === actual && status === "Halted";
  return (
    <div className={`result-check ${pass ? "result-check--pass" : ""}`}>
      <span>Expected {hex8(expected)}</span>
      <strong>Actual {hex8(actual)}</strong>
      <b>{pass ? "PASS" : status === "Halted" ? "FAIL" : "PENDING"}</b>
    </div>
  );
}
