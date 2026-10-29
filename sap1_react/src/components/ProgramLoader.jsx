import { useState } from "react";
import { parseNumber } from "../engine/format.js";

/** @param {{ onLoadProgram:Function, errors?:string[] }} props */
export default function ProgramLoader({ onLoadProgram, errors = [] }) {
  const [values, setValues] = useState({ a: "", b: "", c: "" });
  const [addresses, setAddresses] = useState({ a: "9", b: "A", c: "B" });
  const [operation2, setOperation2] = useState("ADD");
  const [operation3, setOperation3] = useState("SUB");
  const [localError, setLocalError] = useState("");
  const formulaLabel = `Formula: A ${operation2 === "ADD" ? "+" : "-"} B ${operation3 === "ADD" ? "+" : "-"} C`;
  const submit = (event) => {
    event.preventDefault();
    const data = ["a", "b", "c"].map((key) => parseNumber(values[key], 16));
    const dataAddresses = ["a", "b", "c"].map((key) =>
      parseNumber(addresses[key], 16),
    );
    if (data.some((value) => value === null || value > 0xff)) {
      setLocalError("Enter data values from 00H to FFH.");
      return;
    }
    if (
      dataAddresses.some((value) => value === null || value > 0x0f) ||
      new Set(dataAddresses).size !== 3
    ) {
      setLocalError("Use three different memory addresses from 0H to FH.");
      return;
    }
    if (dataAddresses.some((value) => value < 0x5)) {
      setLocalError(
        "Data addresses 0H to 4H are reserved for the sample instructions.",
      );
      return;
    }
    const memory = Array(16).fill(0);
    memory[0] = dataAddresses[0];
    // Encode the selected operations while keeping program construction in the loader.
    memory[1] = (operation2 === "ADD" ? 0x10 : 0x20) | dataAddresses[1];
    memory[2] = (operation3 === "ADD" ? 0x10 : 0x20) | dataAddresses[2];
    memory[3] = 0xef;
    memory[4] = 0xff;
    dataAddresses.forEach((address, index) => {
      memory[address] = data[index];
    });
    setLocalError("");
    onLoadProgram(memory, {
      values: data,
      operation2,
      operation3,
    });
  };
  return (
    <section className="panel loader-panel" id="program-loader">
      <div className="section-heading">
        <span>00</span>
        <h2>Load program</h2>
      </div>
      <p className="loader-copy">LDA, ADD, SUB, OUT, HLT</p>
      <p className="formula-label">{formulaLabel}</p>
      <form onSubmit={submit}>
        <div className="program-memory-map">
          {/* The memory map reflects the currently selected operation opcodes. */}
          <span>
            0H LDA <b>{addresses.a || "?"}H</b>
          </span>
          <span>
            1H {operation2} <b>{addresses.b || "?"}H</b>
          </span>
          <span>
            2H {operation3} <b>{addresses.c || "?"}H</b>
          </span>
          <span>3H OUT</span>
          <span>4H HLT</span>
        </div>
        <div className="formula-inputs">
          {["a", "b", "c"].map((key) => (
            <label key={key}>
              {key.toUpperCase()} DATA
              <input
                aria-label={`${key.toUpperCase()} data`}
                value={values[key]}
                onChange={(event) =>
                  setValues({
                    ...values,
                    [key]: event.target.value.toUpperCase(),
                  })
                }
                placeholder="00H"
                inputMode="text"
              />
            </label>
          ))}
        </div>
        <div className="formula-inputs address-inputs">
          {["a", "b", "c"].map((key) => (
            <label key={key}>
              {key.toUpperCase()} ADDRESS
              <input
                aria-label={`${key.toUpperCase()} address`}
                value={addresses[key]}
                onChange={(event) =>
                  setAddresses({
                    ...addresses,
                    [key]: event.target.value.toUpperCase(),
                  })
                }
                inputMode="text"
              />
            </label>
          ))}
        </div>
        {/* The two operation selectors define the instructions at 1H and 2H. */}
        <div className="formula-inputs operation-inputs">
          <label>
            OPERATION 2
            <select
              value={operation2}
              onChange={(event) => setOperation2(event.target.value)}
            >
              <option value="ADD">ADD</option>
              <option value="SUB">SUB</option>
            </select>
          </label>
          <label>
            OPERATION 3
            <select
              value={operation3}
              onChange={(event) => setOperation3(event.target.value)}
            >
              <option value="ADD">ADD</option>
              <option value="SUB">SUB</option>
            </select>
          </label>
        </div>
        {(localError || errors.length > 0) && (
          <div className="error-box" role="alert">
            {localError || errors.join(" ")}
          </div>
        )}
        <button
          className="sample-button"
          type="button"
          onClick={() => setValues({ a: "", b: "", c: "" })}
        >
          Load sample program
        </button>
        <button className="primary-button" type="submit">
          Load program
        </button>
      </form>
    </section>
  );
}
