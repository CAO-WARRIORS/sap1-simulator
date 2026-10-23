import { useState } from "react";
import { formulaNames } from "../engine/assembler.js";
import { parseNumber } from "../engine/format.js";

/** @param {{ onFormula:Function, onCustom:Function, errors:string[] }} props */
export default function ProgramLoader({ onFormula, onCustom, errors }) {
  const [mode, setMode] = useState("formula");
  const [base, setBase] = useState(16);
  const [values, setValues] = useState({ a: "25", b: "05", c: "23" });
  const [formula, setFormula] = useState("add-sub");
  const [source, setSource] = useState("LDA 9H\nADD AH\nSUB BH\nOUT\nHLT");
  const [localError, setLocalError] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (mode === "custom") {
      onCustom(source);
      return;
    }
    const parsed = ["a", "b", "c"].map((key) => parseNumber(values[key], base));
    if (parsed.some((value) => value === null || value < 0 || value > 0xff)) {
      setLocalError("Enter each value from 00H to FFH.");
      return;
    }
    setLocalError("");
    onFormula(...parsed, formula);
  };
  return (
    <section className="panel loader-panel">
      <div className="section-heading">
        <span>00</span>
        <h2>Load program</h2>
      </div>
      <div className="mode-tabs">
        <button
          className={mode === "formula" ? "selected" : ""}
          onClick={() => setMode("formula")}
          type="button"
        >
          Formula
        </button>
        <button
          className={mode === "custom" ? "selected" : ""}
          onClick={() => setMode("custom")}
          type="button"
        >
          Custom assembly
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "formula" ? (
          <>
            <div className="input-toolbar">
              <span>Input base</span>
              <button
                type="button"
                className={base === 16 ? "selected" : ""}
                onClick={() => setBase(16)}
              >
                HEX
              </button>
              <button
                type="button"
                className={base === 10 ? "selected" : ""}
                onClick={() => setBase(10)}
              >
                DEC
              </button>
            </div>
            <div className="formula-inputs">
              {["a", "b", "c"].map((key) => (
                <label key={key}>
                  {key.toUpperCase()}
                  <input
                    aria-label={`Value ${key.toUpperCase()}`}
                    value={values[key]}
                    onChange={(event) =>
                      setValues({ ...values, [key]: event.target.value })
                    }
                    inputMode="numeric"
                  />
                </label>
              ))}
            </div>
            <label className="wide-label">
              Formula
              <select
                value={formula}
                onChange={(event) => setFormula(event.target.value)}
              >
                {Object.entries(formulaNames).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="wide-label">
            Assembly or machine code
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows="6"
              aria-label="Custom SAP-1 program"
            ></textarea>
          </label>
        )}{" "}
        {(localError || errors.length > 0) && (
          <div className="error-box" role="alert">
            {localError || errors.join(" ")}
          </div>
        )}
        <button className="primary-button" type="submit">
          Load program
        </button>
      </form>
    </section>
  );
}
