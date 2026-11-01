import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { useSap1 } from "./hooks/useSap1";
import {
  decode,
  formatInstruction,
  INSTRUCTIONS,
  SIGNALS,
} from "./sap1/instructions";
import { parseQuickEntry } from "./sap1/parser";
import { PRESETS } from "./sap1/presets";
import { groupedBin, toBin, toHex } from "./sap1/utils";

const addresses = Array.from({ length: 16 }, (_, index) => index);
const instructionNames = ["DATA", ...Object.keys(INSTRUCTIONS)];

function Button({ children, className = "", ...props }) {
  return (
    <button className={`button ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}
function Panel({ title, children, className = "", action }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Bits({ value, bits = 8 }) {
  return (
    <div className="bits" aria-label={`${toBin(value, bits)} binary value`}>
      {toBin(value, bits)
        .split("")
        .map((bit, index) => (
          <span
            className={bit === "1" ? "bit on" : "bit"}
            key={`${index}-${bit}`}
          >
            {bit}
          </span>
        ))}
    </div>
  );
}
function RegisterCard({ label, value, bits = 8, note, changed }) {
  return (
    <article className={`register-card ${changed ? "changed" : ""}`}>
      <div className="register-label">
        <strong>{label}</strong>
        <span>{toHex(value, bits / 4)}</span>
      </div>
      <Bits value={value} bits={bits} />
      {note && <small>{note}</small>}
    </article>
  );
}
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const handler = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="panel-heading">
          <h2 id="modal-title">{title}</h2>
          <Button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            x
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgramEditor({ state, dispatch }) {
  const [mode, setMode] = useState("grid");
  const [quickText, setQuickText] = useState(PRESETS["25H + 05H - 23H = 07H"]);
  const [errors, setErrors] = useState([]);
  const [draft, setDraft] = useState(Array(16).fill(0));
  const update = (address, value) =>
    setDraft((current) =>
      current.map((item, index) => (index === address ? value : item)),
    );
  const applyQuick = () => {
    const result = parseQuickEntry(quickText);
    setErrors(result.errors);
    if (!result.errors.length) setDraft(result.ram);
  };
  const applyPreset = (name) => {
    const text = PRESETS[name];
    setQuickText(text);
    const result = parseQuickEntry(text);
    setDraft(result.ram);
    setErrors([]);
  };
  const displayInstruction = (address) => {
    const byte = draft[address];
    const { mnemonic, operand } = decode(byte);
    return mnemonic
      ? { mnemonic, operand }
      : { mnemonic: "DATA", operand: byte };
  };
  return (
    <Panel
      title="Program Editor"
      className="editor-panel"
      action={
        <div className="segmented">
          <button
            className={mode === "grid" ? "selected" : ""}
            onClick={() => setMode("grid")}
          >
            Grid
          </button>
          <button
            className={mode === "quick" ? "selected" : ""}
            onClick={() => setMode("quick")}
          >
            Quick entry
          </button>
        </div>
      }
    >
      {mode === "grid" ? (
        <div className="editor-grid">
          {addresses.map((address) => {
            const item = displayInstruction(address);
            return (
              <div className="editor-row" key={address}>
                <span className="address">
                  {address.toString(16).toUpperCase()}
                </span>
                <select
                  value={item.mnemonic}
                  aria-label={`Instruction at address ${address.toString(16)}`}
                  onChange={(event) => {
                    const mnemonic = event.target.value;
                    update(
                      address,
                      mnemonic === "DATA" ? 0 : INSTRUCTIONS[mnemonic] << 4,
                    );
                  }}
                >
                  {instructionNames.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                {item.mnemonic === "DATA" ? (
                  <input
                    className="hex-input"
                    value={toHex(item.operand)}
                    onChange={(event) => {
                      const value = Number.parseInt(
                        event.target.value.replace(/H$/i, ""),
                        16,
                      );
                      if (!Number.isNaN(value) && value >= 0 && value <= 255)
                        update(address, value);
                    }}
                    aria-label={`Data at address ${address.toString(16)}`}
                  />
                ) : (
                  <select
                    value={item.operand}
                    disabled={["OUT", "HLT"].includes(item.mnemonic)}
                    aria-label={`Operand at address ${address.toString(16)}`}
                    onChange={(event) =>
                      update(
                        address,
                        (INSTRUCTIONS[item.mnemonic] << 4) |
                          Number(event.target.value),
                      )
                    }
                  >
                    {addresses.map((value) => (
                      <option key={value} value={value}>
                        {value.toString(16).toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="quick-entry">
          <textarea
            value={quickText}
            onChange={(event) => setQuickText(event.target.value)}
            aria-label="Quick program entry"
            spellCheck="false"
          />
          {errors.map((error) => (
            <div className="error" key={error}>
              {error}
            </div>
          ))}
          <Button onClick={applyQuick}>Parse entries</Button>
        </div>
      )}
      <div className="editor-actions">
        <Button
          className="primary"
          onClick={() => dispatch({ type: "load", ram: draft })}
        >
          Load Program
        </Button>
        <div className="preset-list">
          {Object.keys(PRESETS).map((name) => (
            <button key={name} onClick={() => applyPreset(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>
      {state.loaded && (
        <p className="success">
          Program loaded into RAM. Values remain editable above.
        </p>
      )}
    </Panel>
  );
}
function Controls({ state, dispatch }) {
  return (
    <Panel title="Controls" className="controls-panel">
      <div className="control-row">
        <Button
          onClick={() => dispatch({ type: "step" })}
          disabled={!state.loaded || state.halted}
        >
          Step
        </Button>
        <Button
          onClick={() => dispatch({ type: "micro" })}
          disabled={!state.loaded || state.halted}
        >
          Micro-step
        </Button>
        <Button
          className="primary"
          onClick={() => dispatch({ type: state.running ? "pause" : "run" })}
          disabled={!state.loaded || state.halted}
        >
          {state.running ? "Pause" : "Run"}
        </Button>
        <Button onClick={() => dispatch({ type: "reset" })}>Reset</Button>
      </div>
      <label className="speed">
        Clock speed <strong>{state.speed} ms</strong>
        <input
          type="range"
          min="100"
          max="1500"
          step="50"
          value={state.speed}
          onChange={(event) =>
            dispatch({ type: "speed", value: Number(event.target.value) })
          }
        />
        <span>
          <small>Fast</small>
          <small>Slow</small>
        </span>
      </label>
      <button
        className="text-button"
        onClick={() => dispatch({ type: "clear" })}
      >
        Clear RAM
      </button>
    </Panel>
  );
}
function RamViewer({ state }) {
  return (
    <Panel title="RAM · 16 x 8-bit" className="ram-panel">
      <div className="ram-grid">
        {addresses.map((address) => (
          <div
            className={`ram-cell ${state.mar === address && state.tState ? "mar-cell" : ""} ${state.lastRead === address ? "read-cell" : ""}`}
            key={address}
          >
            <span className="ram-address">
              {address.toString(16).toUpperCase()}H{" "}
              {state.pc === address && <em>PC</em>}
            </span>
            <strong>{toHex(state.ram[address])}</strong>
            <small>
              {formatInstruction(state.ram[address]) === "DATA"
                ? "(data)"
                : formatInstruction(state.ram[address])}
            </small>
          </div>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="dot indigo" />
          MAR
        </span>
        <span>
          <i className="dot amber" />
          Reading
        </span>
        <span>
          <i className="dot green" />
          Executed
        </span>
      </div>
    </Panel>
  );
}
function BusDiagram({ state }) {
  const active = state.bus.source || state.bus.destination;
  const blocks = ["PC", "MAR", "RAM", "IR", "A", "ALU", "B", "OUT"];
  return (
    <Panel title="W-Bus activity" className="bus-panel">
      <div className="bus-wrap">
        <svg viewBox="0 0 760 150" role="img" aria-label="SAP-1 W-Bus diagram">
          <line
            className={state.bus.source ? "bus-line active" : "bus-line"}
            x1="30"
            y1="80"
            x2="730"
            y2="80"
          />
          <circle
            className={state.bus.source ? "bus-dot moving" : "bus-dot"}
            cx="380"
            cy="80"
            r="5"
          />
          {blocks.map((block, index) => {
            const x = 10 + index * 96;
            return (
              <g
                className={active === block ? "bus-block active" : "bus-block"}
                key={block}
              >
                <rect x={x} y="45" width="70" height="42" rx="6" />
                <text x={x + 35} y="70" textAnchor="middle">
                  {block}
                </text>
              </g>
            );
          })}
          <text className="bus-value" x="380" y="125" textAnchor="middle">
            {state.bus.source
              ? `${toHex(state.bus.value)} · ${groupedBin(state.bus.value)}`
              : "idle"}
          </text>
        </svg>
      </div>
      <div className="signal-list">
        {SIGNALS.map((signal) => (
          <span
            className={state.controlWord[signal] ? "signal active" : "signal"}
            key={signal}
          >
            {signal}
          </span>
        ))}
      </div>
    </Panel>
  );
}
function OutputLeds({ value }) {
  return (
    <Panel title="Output Register" className="output-panel">
      <div className="output-content">
        <div className="leds">
          {toBin(value)
            .split("")
            .map((bit, index) => (
              <div className="led-item" key={index}>
                <span
                  className={`led ${bit === "1" ? "lit" : ""}`}
                  aria-label={`Bit ${7 - index} ${bit === "1" ? "on" : "off"}`}
                />
                <small>{7 - index}</small>
              </div>
            ))}
        </div>
        <div className="output-readout">
          <strong>{toHex(value)}</strong>
          <span>{groupedBin(value)}</span>
          <small>{value} decimal</small>
        </div>
      </div>
    </Panel>
  );
}
function Registers({ state }) {
  const changed = state.tState !== 0;
  const instruction = decode(state.ir);
  return (
    <div className="register-grid">
      <RegisterCard label="PC" value={state.pc} bits={4} changed={changed} />
      <RegisterCard label="MAR" value={state.mar} bits={4} changed={changed} />
      <article className="register-card ir-card">
        <div className="register-label">
          <strong>IR</strong>
          <span>{toHex(state.ir)}</span>
        </div>
        <div className="nibble-labels">
          <span>opcode {instruction.opcode.toString(16).toUpperCase()}</span>
          <span>operand {instruction.operand.toString(16).toUpperCase()}</span>
        </div>
        <Bits value={state.ir} />
      </article>
      <RegisterCard label="A" value={state.a} bits={8} changed={changed} />
      <RegisterCard label="B" value={state.b} bits={8} changed={changed} />
      <RegisterCard
        label="ALU"
        value={state.alu.result}
        bits={8}
        note={`Su=${state.alu.su} · ${state.alu.su ? "subtracts" : "adds"}`}
      />
      <RegisterCard label="OUT" value={state.out} bits={8} changed={changed} />
    </div>
  );
}
function InstructionTable({ state }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Instruction</th>
            <th>Machine code</th>
          </tr>
        </thead>
        <tbody>
          {addresses.map((address) => (
            <tr
              className={
                state.pc === address
                  ? "current-row"
                  : state.lastRead === address
                    ? "read-row"
                    : state.executed.includes(address)
                      ? "executed-row"
                      : ""
              }
              key={address}
            >
              <td>{address.toString(16).toUpperCase()}H</td>
              <td>{formatInstruction(state.ram[address])}</td>
              <td className="mono">{groupedBin(state.ram[address])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function StatusBar({ state }) {
  const current = formatInstruction(state.ir);
  return (
    <footer className="status-bar">
      <div>
        <small>Now executing</small>
        <strong>{current === "DATA" ? "Waiting for fetch" : current}</strong>
        <span>
          PC {toHex(state.pc, 1)} · <b>T{state.tState || "-"}</b>
        </span>
      </div>
      <div className="ring">
        <small>Ring counter</small>
        <div>
          {[1, 2, 3, 4, 5, 6].map((t) => (
            <span
              className={
                state.tState === t
                  ? "active"
                  : state.tState > t || (state.tState === 0 && t < 6)
                    ? "done"
                    : ""
              }
              key={t}
            >
              T{t}
            </span>
          ))}
        </div>
      </div>
      <div className="explanation" aria-live="polite">
        <small>In simple words</small>
        <span>{state.status}</span>
        <em>
          {state.halted
            ? "Clock stopped at HLT."
            : "Next: advance one micro-step or run the clock."}
        </em>
      </div>
    </footer>
  );
}

function App() {
  const { state, dispatch } = useSap1();
  const [tab, setTab] = useState("registers");
  const [modal, setModal] = useState(null);
  const expected = useMemo(
    () =>
      state.loaded &&
      state.ram[0] === 0x09 &&
      state.ram[1] === 0x1a &&
      state.ram[2] === 0x2b,
    [state.loaded, state.ram],
  );
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">COMPUTER ARCHITECTURE LAB</p>
          <h1>SAP-1 Simulator</h1>
          <p>fetch - decode - execute, one micro-step at a time</p>
        </div>
        <div className="header-actions">
          <Button onClick={() => setModal("how")}>How SAP-1 Works</Button>
          <Button onClick={() => setModal("tutorial")}>Tutorial</Button>
        </div>
      </header>
      <div className="dashboard">
        <div className="left-column">
          <ProgramEditor state={state} dispatch={dispatch} />
          <Controls state={state} dispatch={dispatch} />
        </div>
        <div className="center-column">
          <RamViewer state={state} />
          <BusDiagram state={state} />
          <OutputLeds value={state.out} />
          {expected && (
            <div className="expected">
              <span>Expected / Actual</span>
              <strong>07H / {toHex(state.out)}</strong>
            </div>
          )}
        </div>
        <div className="right-column">
          <div className="tabs">
            <button
              className={tab === "registers" ? "selected" : ""}
              onClick={() => setTab("registers")}
            >
              Registers
            </button>
            <button
              className={tab === "table" ? "selected" : ""}
              onClick={() => setTab("table")}
            >
              Instruction Table
            </button>
          </div>
          {tab === "registers" ? (
            <Registers state={state} />
          ) : (
            <InstructionTable state={state} />
          )}
        </div>
      </div>
      <StatusBar state={state} />
      {modal && (
        <Modal
          title={modal === "how" ? "How SAP-1 Works" : "Tutorial"}
          onClose={() => setModal(null)}
        >
          {modal === "how" ? (
            <div className="modal-copy">
              <p>
                SAP-1 is an 8-bit teaching computer. The Program Counter selects
                RAM, the MAR holds its address, and the W-Bus moves bytes
                between registers.
              </p>
              <p>
                Every instruction uses a FETCH phase (T1-T3), then an EXECUTE
                phase (T4-T6). LDA loads A, ADD and SUB use the ALU, OUT copies
                A to the Output Register, and HLT stops the clock.
              </p>
              <p>
                The control signal chips show the active hardware gates for the
                current T-state.
              </p>
            </div>
          ) : (
            <ol className="modal-copy">
              <li>
                Choose a preset or enter instructions and data in the editor.
              </li>
              <li>
                Press <strong>Load Program</strong> to copy the values into RAM.
              </li>
              <li>
                Use <strong>Micro-step</strong> to watch each T-state, or{" "}
                <strong>Step</strong> for a complete instruction.
              </li>
              <li>
                Run the clock and pause whenever you want to inspect the bus,
                registers, or output LEDs.
              </li>
            </ol>
          )}
        </Modal>
      )}
    </main>
  );
}
export default App;
