import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { useSap1 } from "./hooks/useSap1";
import {
  ADDRESS_BITS,
  CLOCK_SPEED_STEP,
  DATA_BITS,
  FETCH_T_STATE_COUNT,
  IDLE_T_STATE,
  MAX_CLOCK_SPEED,
  MIN_CLOCK_SPEED,
  NIBBLE_BITS,
  RAM_SIZE,
  SIGNALS,
  T_STATE_COUNT,
  encodeInstruction,
} from "./sap1/config";
import { decode, formatInstruction } from "./sap1/instructions";
import { evaluateProgram } from "./sap1/evaluator";
import { groupedBin, parseHex, toBin, toHex } from "./sap1/utils";

const addresses = Array.from({ length: RAM_SIZE }, (_, index) => index);
const SAMPLE_FIELDS = Object.freeze({
  aData: "25H",
  bData: "05H",
  cData: "23H",
  aAddress: "9",
  bAddress: "A",
  cAddress: "B",
  operation2: "ADD",
  operation3: "SUB",
});
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
function Bits({ value, bits = DATA_BITS }) {
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
function RegisterCard({ label, value, bits = DATA_BITS, note, changed }) {
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
function deriveProgram(fields) {
  const errors = [];
  const dataFields = [
    ["A DATA", "aData"],
    ["B DATA", "bData"],
    ["C DATA", "cData"],
  ];
  const addressFields = [
    ["A ADDRESS", "aAddress"],
    ["B ADDRESS", "bAddress"],
    ["C ADDRESS", "cAddress"],
  ];
  const data = Object.fromEntries(
    dataFields.map(([label, key]) => {
      const value = parseHex(fields[key]);
      if (value === null || value > 0xff)
        errors.push(`${label} must be 00 to FF.`);
      return [key, value];
    }),
  );
  const dataAddresses = Object.fromEntries(
    addressFields.map(([label, key]) => {
      const value = parseHex(fields[key]);
      if (value === null || value > 0xf)
        errors.push(`${label} must be 0 to F.`);
      return [key, value];
    }),
  );
  const usedAddresses = addressFields
    .map(([, key]) => dataAddresses[key])
    .filter((value) => value !== null);
  if (usedAddresses.some((value) => value <= 4))
    errors.push("Data addresses cannot overlap the program area (0 to 4).");
  if (new Set(usedAddresses).size !== usedAddresses.length)
    errors.push("Data addresses must not overlap each other.");
  const instructions = [
    ["LDA", dataAddresses.aAddress],
    [fields.operation2, dataAddresses.bAddress],
    [fields.operation3, dataAddresses.cAddress],
    ["OUT", null],
    ["HLT", null],
  ];
  const ram = Array(RAM_SIZE).fill(0);
  const entries = Array(RAM_SIZE).fill(null);
  instructions.forEach(([mnemonic, operand], address) => {
    ram[address] = encodeInstruction(mnemonic, operand ?? 0xf);
    entries[address] = { kind: "instruction", mnemonic, operand };
  });
  dataFields.forEach(([, key], index) => {
    const address = dataAddresses[addressFields[index][1]];
    if (address !== null && address > 4 && data[key] !== null) {
      ram[address] = data[key];
      entries[address] = { kind: "data", value: data[key] };
    }
  });
  const valid = errors.length === 0;
  const expectedValue = valid
    ? [fields.operation2, fields.operation3].reduce(
        (value, operation, index) => {
          const operand = data[dataFields[index + 1][1]];
          return operation === "ADD"
            ? (value + operand) & 0xff
            : (value - operand + 256) & 0xff;
        },
        data.aData,
      )
    : null;
  return { ram, entries, errors, valid, expectedValue };
}

function ProgramEditor({ state, dispatch, program, fields, setFields }) {
  const updateField = (key, value) =>
    setFields((current) => ({ ...current, [key]: value.toUpperCase() }));
  const formula = `A ${fields.operation2 === "ADD" ? "+" : "-"} B ${fields.operation3 === "ADD" ? "+" : "-"} C`;
  const loadProgram = () =>
    dispatch({ type: "load", ram: program.ram, entries: program.entries });
  const loadSample = () => {
    setFields(SAMPLE_FIELDS);
    const sample = deriveProgram(SAMPLE_FIELDS);
    dispatch({ type: "load", ram: sample.ram, entries: sample.entries });
  };
  return (
    <Panel title="Program Editor" className="editor-panel">
      <p className="editor-subtitle">LDA, ADD, SUB, OUT, HLT</p>
      <p className="formula">
        Formula: <strong>{formula}</strong>
      </p>
      <div className="program-preview" aria-label="Generated program preview">
        {program.entries.map((entry, address) =>
          entry ? (
            <div className="preview-line" key={address}>
              <span>{address.toString(16).toUpperCase()}:</span>
              <strong>
                {entry.kind === "data" ? (
                  toHex(entry.value)
                ) : (
                  <>
                    {entry.mnemonic}
                    {entry.operand !== null && (
                      <>
                        {" "}
                        <em>{entry.operand.toString(16).toUpperCase()}</em>
                      </>
                    )}
                  </>
                )}
              </strong>
            </div>
          ) : null,
        )}
      </div>
      <div className="editor-fields">
        {[
          ["A", "aData", "aAddress"],
          ["B", "bData", "bAddress"],
          ["C", "cData", "cAddress"],
        ].map(([label, dataKey, addressKey]) => (
          <div className="field-column" key={label}>
            <label>
              {label} DATA
              <input
                value={fields[dataKey]}
                onChange={(event) => updateField(dataKey, event.target.value)}
                maxLength={3}
              />
            </label>
            <label>
              {label} ADDRESS
              <input
                value={fields[addressKey]}
                onChange={(event) =>
                  updateField(addressKey, event.target.value)
                }
                maxLength={2}
              />
            </label>
          </div>
        ))}
      </div>
      <div className="operation-fields">
        <label>
          OPERATION 2
          <select
            value={fields.operation2}
            onChange={(event) => updateField("operation2", event.target.value)}
          >
            <option>ADD</option>
            <option>SUB</option>
          </select>
        </label>
        <label>
          OPERATION 3
          <select
            value={fields.operation3}
            onChange={(event) => updateField("operation3", event.target.value)}
          >
            <option>ADD</option>
            <option>SUB</option>
          </select>
        </label>
      </div>
      {program.errors.map((error) => (
        <div className="error" key={error}>
          {error}
        </div>
      ))}
      <div className="editor-actions">
        <Button onClick={loadSample}>Load sample program</Button>
        <Button
          className="primary"
          onClick={loadProgram}
          disabled={!program.valid}
        >
          Load program
        </Button>
      </div>
      {state.loaded && (
        <p className="success">
          Program loaded into RAM. Values remain editable above.
        </p>
      )}
    </Panel>
  );
}
function Controls({ state, dispatch, onExecutionStart, onReset }) {
  return (
    <Panel title="Controls" className="controls-panel">
      <div className="control-row">
        <Button
          onClick={() => {
            onExecutionStart();
            dispatch({ type: "step" });
          }}
          disabled={!state.loaded || state.halted}
        >
          Step
        </Button>
        <Button
          onClick={() => {
            onExecutionStart();
            dispatch({ type: "micro" });
          }}
          disabled={!state.loaded || state.halted}
        >
          Micro-step
        </Button>
        <Button
          className="primary"
          onClick={() => {
            if (!state.running) onExecutionStart();
            dispatch({ type: state.running ? "pause" : "run" });
          }}
          disabled={!state.loaded || state.halted}
        >
          {state.running ? "Pause" : "Run"}
        </Button>
        <Button
          onClick={() => {
            dispatch({ type: "reset" });
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
      <label className="speed">
        Clock speed <strong>{state.speed} ms</strong>
        <input
          type="range"
          min={MIN_CLOCK_SPEED}
          max={MAX_CLOCK_SPEED}
          step={CLOCK_SPEED_STEP}
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
    <Panel title={`RAM · ${RAM_SIZE} x ${DATA_BITS}-bit`} className="ram-panel">
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
              {state.loaded && state.entries[address]
                ? state.entries[address].kind === "data"
                  ? "(data)"
                  : formatInstruction(state.ram[address])
                : ""}
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
  const blocks = [
    { id: "PC", label: "PC" },
    { id: "MAR", label: "MAR" },
    { id: "RAM", label: "RAM" },
    { id: "IR", label: "IR" },
    { id: "A", label: "A" },
    { id: "ALU", label: "ALU" },
    { id: "B", label: "B" },
    { id: "OUT", label: "Output" },
  ];
  const blockX = (id) => 10 + blocks.findIndex((block) => block.id === id) * 96;
  const sourceX = blockX(state.bus.source) + 35;
  const destinationX = blockX(state.bus.destination) + 35;
  const animating = state.running && state.bus.source && !state.halted;
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
            className={animating ? "bus-dot moving" : "bus-dot"}
            cx={animating ? sourceX : 380}
            cy="80"
            r="5"
          >
            {animating && (
              <animate
                key={`${state.cycleCount}-${state.tState}`}
                attributeName="cx"
                from={sourceX}
                to={destinationX}
                dur={`${Math.max(80, state.speed * 0.75)}ms`}
                repeatCount="1"
                fill="freeze"
              />
            )}
          </circle>
          {blocks.map((block, index) => {
            const x = 10 + index * 96;
            return (
              <g
                className={
                  state.bus.source === block.id ||
                  state.bus.destination === block.id
                    ? "bus-block active"
                    : "bus-block"
                }
                key={block.id}
              >
                <rect x={x} y="45" width="70" height="42" rx="6" />
                <text x={x + 35} y="70" textAnchor="middle">
                  {block.label}
                </text>
              </g>
            );
          })}
          <text className="bus-value" x="380" y="125" textAnchor="middle">
            {animating
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
          {toBin(value, DATA_BITS)
            .split("")
            .map((bit, index) => (
              <div className="led-item" key={index}>
                <span
                  className={`led ${bit === "1" ? "lit" : ""}`}
                  aria-label={`Bit ${DATA_BITS - 1 - index} ${bit === "1" ? "on" : "off"}`}
                />
                <small>{DATA_BITS - 1 - index}</small>
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
      <RegisterCard
        label="PC"
        value={state.pc}
        bits={ADDRESS_BITS}
        changed={changed}
      />
      <RegisterCard
        label="MAR"
        value={state.mar}
        bits={ADDRESS_BITS}
        changed={changed}
      />
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
      <RegisterCard
        label="A"
        value={state.a}
        bits={DATA_BITS}
        changed={changed}
      />
      <RegisterCard
        label="B"
        value={state.b}
        bits={DATA_BITS}
        changed={changed}
      />
      <RegisterCard
        label="ALU"
        value={state.alu.result}
        bits={DATA_BITS}
        note={`Su=${state.alu.su} · ${state.alu.su ? "subtracts" : "adds"}`}
      />
      <RegisterCard
        label="OUT"
        value={state.out}
        bits={DATA_BITS}
        changed={changed}
      />
    </div>
  );
}
function InstructionTable({ state, program }) {
  const rows = useMemo(
    () =>
      addresses.map((address) => ({
        address,
        entry: program.entries[address],
        machineCode: program.entries[address]
          ? groupedBin(program.ram[address])
          : "",
      })),
    [program],
  );
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
          {rows.map(({ address, entry, machineCode }) => (
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
              <td>
                {entry
                  ? entry.kind === "data"
                    ? toHex(entry.value)
                    : entry.operand === null
                      ? entry.mnemonic
                      : `${entry.mnemonic} ${entry.operand.toString(16).toUpperCase()}H`
                  : ""}
              </td>
              <td className="mono">{machineCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function StatusBar({ state }) {
  const current =
    state.tState === IDLE_T_STATE
      ? "Idle"
      : state.tState <= FETCH_T_STATE_COUNT
        ? "Fetching instruction"
        : formatInstruction(state.ir);
  return (
    <footer className="status-bar">
      <div>
        <small>Now executing</small>
        <strong>{current}</strong>
        <span>
          PC {toHex(state.pc, ADDRESS_BITS / NIBBLE_BITS)} ·{" "}
          <b>T{state.tState || "-"}</b>
        </span>
      </div>
      <div className="ring">
        <small>Ring counter</small>
        <div>
          {Array.from({ length: T_STATE_COUNT }, (_, index) => index + 1).map(
            (t) => (
              <span
                className={
                  state.tState === t ? "active" : state.tState > t ? "done" : ""
                }
                key={t}
              >
                T{t}
              </span>
            ),
          )}
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
  const [activeTab, setActiveTab] = useState("registers");
  const [modal, setModal] = useState(null);
  const [fields, setFields] = useState(SAMPLE_FIELDS);
  const program = useMemo(() => deriveProgram(fields), [fields]);
  const expected = useMemo(
    () =>
      program.valid
        ? evaluateProgram(program.ram)
        : { outputSeen: false, out: null },
    [program],
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
          <ProgramEditor
            state={state}
            dispatch={dispatch}
            program={program}
            fields={fields}
            setFields={setFields}
          />
          <Controls
            state={state}
            dispatch={dispatch}
            onExecutionStart={() => {
              if (state.tState === IDLE_T_STATE && state.cycleCount === 0)
                setActiveTab("table");
            }}
            onReset={() => setActiveTab("registers")}
          />
        </div>
        <div className="center-column">
          <RamViewer state={state} />
          <BusDiagram state={state} />
          <OutputLeds value={state.out} />
          <div className="expected">
            <div>
              <span>Expected</span>
              <strong>
                {program.expectedValue === null
                  ? "--"
                  : `${toHex(program.expectedValue)} (${groupedBin(program.expectedValue)})`}
              </strong>
            </div>
            <div>
              <span>Actual</span>
              <strong>
                {expected.outputSeen
                  ? `${toHex(state.out)} (${groupedBin(state.out)})`
                  : "--"}
              </strong>
            </div>
            <b
              className={`status-badge ${expected.outputSeen ? (state.out === program.expectedValue ? "match" : "mismatch") : "pending"}`}
            >
              {expected.outputSeen
                ? state.out === program.expectedValue
                  ? "MATCH"
                  : "MISMATCH"
                : "PENDING"}
            </b>
          </div>
        </div>
        <div className="right-column">
          <div className="tabs">
            <button
              className={activeTab === "registers" ? "selected" : ""}
              onClick={() => setActiveTab("registers")}
            >
              Registers
            </button>
            <button
              className={activeTab === "table" ? "selected" : ""}
              onClick={() => setActiveTab("table")}
            >
              Instruction Table
            </button>
          </div>
          {activeTab === "registers" ? (
            <Registers state={state} />
          ) : state.running ||
            state.tState !== 0 ||
            state.cycleCount > 0 ||
            state.halted ||
            state.executed.length > 0 ||
            state.lastRead !== null ? (
            <InstructionTable state={state} program={program} />
          ) : (
            <p className="empty-state">
              Run a program to see the instruction table.
            </p>
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
