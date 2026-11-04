import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const TUTORIAL_STEPS = [
  {
    target: "editor",
    title: "Set up a program",
    body: "The editor starts with an example: 25H + 05H - 23H. Change the data, addresses, or operations to explore your own calculation. Data addresses must be unique and outside the program area (0H-4H).",
  },
  {
    target: "editor",
    title: "Load the program",
    body: "Press Load program to copy the instructions and data into RAM. Load sample fills in the example and loads it for you. The preview shows the instructions that will run.",
  },
  {
    target: "ram",
    title: "Inspect RAM",
    body: "The first five locations contain LDA, ADD, SUB, OUT, and HLT. The example's data is stored at 9H, AH, and BH. While running, the highlights show which addresses the CPU is using.",
  },
  {
    target: "transport",
    title: "Choose how to run",
    body: "Micro-step advances one T-state, Step finishes one instruction, and Run continues until HLT. Try Micro-step to see the CPU work a little at a time; Reset restarts without erasing the program.",
  },
  {
    target: "bus",
    title: "Follow the W-Bus",
    body: "After each micro-step, check the arrow and highlighted blocks to see where data moves. The active signal chips show which control signals enable that transfer.",
  },
  {
    target: "cpu",
    title: "Inspect CPU state",
    body: "Registers shows values such as PC, IR, A, and B. Instruction Table shows each instruction and its machine code. The current row follows the program as it executes.",
  },
  {
    target: "output",
    title: "Read the output",
    body: "When OUT executes, the Output Register displays the answer in hexadecimal, binary, and as eight LEDs. For the sample program, the result is 07H.",
  },
  {
    target: "expected",
    title: "Check the result",
    body: "Expected is calculated from the editor values; Actual appears after OUT. MATCH confirms the simulated result agrees with the expected value.",
  },
  {
    target: "status",
    title: "Understand each cycle",
    body: "Now executing and the ring counter show the current instruction and T-state. The plain-language status explains the latest action. Press Reset to replay the loaded program.",
  },
];

function Button({ children, className = "", ...props }) {
  return (
    <button className={`button ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}

function Panel({ title, children, className = "", action, tourTarget, tour }) {
  return (
    <section
      className={`panel ${className} ${tour ? "tutorial-highlight" : ""}`}
      data-tour-target={tourTarget}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TutorialHint({ step, index, total, onBack, onNext, onClose }) {
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  if (!step) return null;

  const isLast = index === total - 1;

  const startDrag = (event) => {
    const bounds = event.currentTarget
      .closest(".tutorial-hint")
      .getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPosition({ x: bounds.left, y: bounds.top });
    setDragging(true);
    event.preventDefault();
  };

  const moveDrag = (event) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget
      .closest(".tutorial-hint")
      .getBoundingClientRect();
    setPosition({
      x: Math.max(
        8,
        Math.min(
          window.innerWidth - bounds.width - 8,
          event.clientX - drag.current.offsetX,
        ),
      ),
      y: Math.max(
        8,
        Math.min(
          window.innerHeight - bounds.height - 8,
          event.clientY - drag.current.offsetY,
        ),
      ),
    });
  };

  const stopDrag = (event) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const moveWithKeyboard = (event) => {
    const directions = {
      ArrowDown: [0, 20],
      ArrowLeft: [-20, 0],
      ArrowRight: [20, 0],
      ArrowUp: [0, -20],
    };
    const direction = directions[event.key];
    if (!direction) return;

    event.preventDefault();
    const card = event.currentTarget.closest(".tutorial-hint");
    const bounds = card.getBoundingClientRect();
    setPosition({
      x: Math.max(
        8,
        Math.min(
          window.innerWidth - bounds.width - 8,
          (position?.x ?? bounds.left) + direction[0],
        ),
      ),
      y: Math.max(
        8,
        Math.min(
          window.innerHeight - bounds.height - 8,
          (position?.y ?? bounds.top) + direction[1],
        ),
      ),
    });
  };

  return createPortal(
    <aside
      className={`tutorial-hint ${dragging ? "dragging" : ""}`}
      aria-live="polite"
      style={
        position
          ? {
              left: position.x,
              top: position.y,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
    >
      <div className="tutorial-card-header">
        <span
          className="tutorial-drag-handle"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onKeyDown={moveWithKeyboard}
          role="button"
          tabIndex={0}
          aria-label="Move tutorial card with arrow keys"
          title="Drag to move the tutorial"
        >
          <span className="drag-grip" aria-hidden="true">
            ⠿
          </span>
          GUIDED TOUR · STEP {index + 1} OF {total}
        </span>
        <button type="button" className="text-button" onClick={onClose}>
          Exit tutorial
        </button>
      </div>
      <div
        className="tutorial-progress"
        role="progressbar"
        aria-label="Tutorial progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <div className="tutorial-actions">
        <Button onClick={onBack} disabled={index === 0}>
          Back
        </Button>
        <Button className="primary" onClick={onNext}>
          {isLast ? "Finish" : "Next"}
        </Button>
      </div>
    </aside>,
    document.body,
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
            ×
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

function ProgramEditor({ state, dispatch, program, fields, setFields, tour }) {
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
    <Panel
      title="Program Editor"
      className="editor-panel"
      tourTarget="editor"
      tour={tour}
    >
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
                    <span className="mnemonic">{entry.mnemonic}</span>
                    {entry.operand !== null && (
                      <>
                        {" "}
                        <em className="operand">
                          {entry.operand.toString(16).toUpperCase()}H
                        </em>
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
                placeholder="25H"
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
                placeholder="9"
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
        <Button onClick={loadSample}>Load sample</Button>
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
          ✓ Program loaded into RAM. Values remain editable above.
        </p>
      )}
    </Panel>
  );
}

function Transport({
  state,
  dispatch,
  onExecutionStart,
  onReset,
  shortcutsEnabled,
  tour,
}) {
  const canAdvance = state.loaded && !state.halted;

  const step = () => {
    onExecutionStart();
    dispatch({ type: "step" });
  };

  const micro = () => {
    onExecutionStart();
    dispatch({ type: "micro" });
  };

  const toggleRun = () => {
    if (!state.running) onExecutionStart();
    dispatch({ type: state.running ? "pause" : "run" });
  };

  const reset = () => {
    dispatch({ type: "reset" });
    onReset();
  };

  useEffect(() => {
    if (!shortcutsEnabled) return undefined;
    const handler = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      const target = event.target;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) ||
        target.isContentEditable
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "r") reset();
      else if (key === "s" && canAdvance) step();
      else if (key === "m" && canAdvance) micro();
      else if (key === "p" && canAdvance) toggleRun();
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  let status = { tone: "ready", label: "Ready" };
  if (!state.loaded)
    status = { tone: "idle", label: "Load a program to begin" };
  else if (state.halted) status = { tone: "halted", label: "Halted" };
  else if (state.running) status = { tone: "running", label: "Running" };
  else if (state.tState !== IDLE_T_STATE || state.cycleCount > 0)
    status = { tone: "paused", label: "Paused" };

  return (
    <div
      className={`transport ${tour ? "tutorial-highlight" : ""}`}
      data-tour-target="transport"
      role="toolbar"
      aria-label="Simulation controls"
    >
      <div className="transport-buttons">
        <Button
          onClick={step}
          disabled={!canAdvance}
          title="Run one full instruction (S)"
        >
          Step <kbd>S</kbd>
        </Button>
        <Button
          onClick={micro}
          disabled={!canAdvance}
          title="Advance one T-state (M)"
        >
          Micro-step <kbd>M</kbd>
        </Button>
        <Button
          className="primary"
          onClick={toggleRun}
          disabled={!canAdvance}
          title="Run or pause the clock (P)"
        >
          {state.running ? "Pause" : "Run"} <kbd>P</kbd>
        </Button>
        <Button onClick={reset} title="Reset the CPU (R)">
          Reset <kbd>R</kbd>
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
      <div className="transport-end">
        <span className={`state-chip ${status.tone}`} aria-live="polite">
          {status.label}
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => dispatch({ type: "clear" })}
        >
          Clear RAM
        </button>
      </div>
    </div>
  );
}

function RamViewer({ state, tour }) {
  return (
    <Panel
      title={`RAM · ${RAM_SIZE} x ${DATA_BITS}-bit`}
      className="ram-panel"
      tourTarget="ram"
      tour={tour}
    >
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
                  ? state.lastRead === address
                    ? "Read"
                    : "Data"
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
          Read
        </span>
        <span>
          <i className="dot green" />
          Executed
        </span>
      </div>
    </Panel>
  );
}

function BusDiagram({ state, tour }) {
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
  const busBits = state.bus.destination === "MAR" ? NIBBLE_BITS : DATA_BITS;

  return (
    <Panel
      title="W-Bus Activity"
      className="bus-panel"
      tourTarget="bus"
      tour={tour}
    >
      <div className="bus-wrap">
        <svg viewBox="0 0 760 150" role="img" aria-label="SAP-1 W-Bus diagram">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--indigo)" />
            </marker>
          </defs>
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
            r="6"
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
            {animating || state.bus.source
              ? `${toHex(state.bus.value, busBits / NIBBLE_BITS)} · ${groupedBin(state.bus.value, busBits)}`
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

function OutputLeds({ value, tour }) {
  return (
    <Panel
      title="Output Register"
      className="output-panel"
      tourTarget="output"
      tour={tour}
    >
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
            <th>Machine Code</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ address, entry, machineCode }) => {
            const status =
              entry?.kind === "data"
                ? state.lastRead === address
                  ? "Read"
                  : "Data"
                : state.pc === address
                  ? "Current"
                  : state.lastRead === address
                    ? "Read"
                    : state.executed.includes(address)
                      ? "Executed"
                      : entry
                        ? "Ready"
                        : "Unused";
            const rowClass =
              status === "Current"
                ? "current-row"
                : status === "Read"
                  ? "read-row"
                  : status === "Executed"
                    ? "executed-row"
                    : "";

            return (
              <tr className={rowClass} key={address}>
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
                <td>
                  <span className={`table-status ${status.toLowerCase()}`}>
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBar({ state, tour }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const current =
    state.tState === IDLE_T_STATE
      ? "Idle"
      : state.tState <= FETCH_T_STATE_COUNT
        ? "Fetching instruction"
        : formatInstruction(state.ir);

  useEffect(() => {
    let timeoutId;
    const handleScroll = () => {
      setIsScrolling(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsScrolling(false), 180);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <footer
      className={`status-bar ${tour ? "tutorial-highlight" : ""} ${isScrolling ? "is-scrolling" : ""}`}
      data-tour-target="status"
    >
      <div>
        <small>Now executing</small>
        <strong>{current}</strong>
        <span>
          PC {toHex(state.pc, ADDRESS_BITS / NIBBLE_BITS)} ·{" "}
          <b>T{state.tState || 1}</b>
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
  const [tutorialIndex, setTutorialIndex] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("sap1-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [fields, setFields] = useState(SAMPLE_FIELDS);

  const tutorialActive = tutorialIndex !== null;
  const activeTutorialStep =
    tutorialIndex === null ? null : TUTORIAL_STEPS[tutorialIndex];
  const getTutorial = (target) =>
    activeTutorialStep?.target === target ? activeTutorialStep : null;
  const closeTutorial = () => setTutorialIndex(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("tutorial-active", tutorialActive);
    return () => root.classList.remove("tutorial-active");
  }, [tutorialActive]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sap1-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!activeTutorialStep) return;
    document
      .querySelector(`[data-tour-target="${activeTutorialStep.target}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTutorialStep]);

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
          <Button
            className="theme-toggle"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M20.2 15.5A8.5 8.5 0 0 1 8.5 3.8 8.5 8.5 0 1 0 20.2 15.5Z" />
              </svg>
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <Button onClick={() => setModal("how")}>How SAP-1 Works</Button>
          <Button
            className="primary"
            onClick={() => {
              setModal(null);
              setTutorialIndex(0);
            }}
          >
            Interactive Tutorial
          </Button>
        </div>
      </header>
      <Transport
        state={state}
        dispatch={dispatch}
        shortcutsEnabled={!modal}
        tour={getTutorial("transport")}
        onExecutionStart={() => {
          if (state.tState === IDLE_T_STATE && state.cycleCount === 0)
            setActiveTab("table");
        }}
        onReset={() => setActiveTab("registers")}
      />
      <BusDiagram state={state} tour={getTutorial("bus")} />
      <div className="dashboard">
        <div className="left-column">
          <ProgramEditor
            state={state}
            dispatch={dispatch}
            program={program}
            fields={fields}
            setFields={setFields}
            tour={getTutorial("editor")}
          />
        </div>
        <div className="center-column">
          <RamViewer state={state} tour={getTutorial("ram")} />
          <div className="result-group">
            <OutputLeds value={state.out} tour={getTutorial("output")} />
            <div
              className={`expected ${getTutorial("expected") ? "tutorial-highlight" : ""}`}
              data-tour-target="expected"
            >
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
                className={`status-badge ${state.halted ? (state.out === program.expectedValue ? "match" : "mismatch") : "pending"}`}
              >
                {state.halted
                  ? state.out === program.expectedValue
                    ? "MATCH"
                    : "MISMATCH"
                  : "NOT RUN YET"}
              </b>
            </div>
          </div>
        </div>
        <div className="right-column">
          <Panel
            title="CPU State"
            className="inspection-panel"
            tourTarget="cpu"
            tour={getTutorial("cpu")}
          >
            <div className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "registers"}
                className={activeTab === "registers" ? "selected" : ""}
                onClick={() => setActiveTab("registers")}
              >
                Registers
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "table"}
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
          </Panel>
        </div>
      </div>
      <StatusBar state={state} tour={getTutorial("status")} />
      {modal && (
        <Modal title="How SAP-1 Works" onClose={() => setModal(null)}>
          <div className="modal-copy">
            <p className="guide-intro">
              SAP-1 (Simple-As-Possible 1) is a small 8-bit teaching computer.
              It demonstrates how a processor fetches an instruction from
              memory, decodes it, and executes it using registers, an arithmetic
              logic unit (ALU), and a shared W-Bus. This simulator has 16 RAM
              addresses (0H-FH); each address stores one byte.
            </p>
            <h3 className="guide-section-title">What the parts do</h3>
            <div className="modal-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>PC · Program Counter</td>
                    <td>Holds the address of the next instruction to fetch.</td>
                  </tr>
                  <tr>
                    <td>MAR · Address Register</td>
                    <td>Selects the RAM address being accessed.</td>
                  </tr>
                  <tr>
                    <td>IR · Instruction Register</td>
                    <td>
                      Holds the fetched instruction: a 4-bit opcode and 4-bit
                      operand.
                    </td>
                  </tr>
                  <tr>
                    <td>A · Accumulator</td>
                    <td>Stores the running value and receives ALU results.</td>
                  </tr>
                  <tr>
                    <td>B · Register</td>
                    <td>Temporarily holds the second value for ADD or SUB.</td>
                  </tr>
                  <tr>
                    <td>ALU</td>
                    <td>
                      Adds A and B or subtracts B from A, keeping the result to
                      8 bits.
                    </td>
                  </tr>
                  <tr>
                    <td>OUT · Output Register</td>
                    <td>
                      Holds the value copied from A by the OUT instruction and
                      drives the LEDs.
                    </td>
                  </tr>
                  <tr>
                    <td>W-Bus · Control signals</td>
                    <td>
                      The shared data path transfers values; signal chips show
                      which registers read or write during each T-state.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 className="guide-section-title">Instructions supported</h3>
            <div className="modal-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>Instruction</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>LDA address</td>
                    <td>Loads the byte at that RAM address into A.</td>
                  </tr>
                  <tr>
                    <td>ADD address</td>
                    <td>Adds the byte at that address to A.</td>
                  </tr>
                  <tr>
                    <td>SUB address</td>
                    <td>Subtracts the byte at that address from A.</td>
                  </tr>
                  <tr>
                    <td>OUT</td>
                    <td>Copies A to the Output Register.</td>
                  </tr>
                  <tr>
                    <td>HLT</td>
                    <td>Stops the clock and halts execution.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 className="guide-section-title">
              Worked example · Load sample
            </h3>
            <p>
              Click <strong>Load sample</strong> in Program Editor. It loads{" "}
              <span className="mono">25H + 05H - 23H</span>. The program
              instructions occupy addresses 0H-4H; the data is stored at 9H, AH,
              and BH. “H” means the number is hexadecimal.
            </p>
            <div className="modal-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>RAM address</th>
                    <th>Instruction / data</th>
                    <th>Machine code</th>
                    <th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0H</td>
                    <td>LDA 9H</td>
                    <td className="mono">0000 1001</td>
                    <td>Load 25H from address 9H into A.</td>
                  </tr>
                  <tr>
                    <td>1H</td>
                    <td>ADD AH</td>
                    <td className="mono">0001 1010</td>
                    <td>Add 05H from address AH to A.</td>
                  </tr>
                  <tr>
                    <td>2H</td>
                    <td>SUB BH</td>
                    <td className="mono">0010 1011</td>
                    <td>Subtract 23H from address BH.</td>
                  </tr>
                  <tr>
                    <td>3H</td>
                    <td>OUT</td>
                    <td className="mono">1110 1111</td>
                    <td>Copy the result in A to the output.</td>
                  </tr>
                  <tr>
                    <td>4H</td>
                    <td>HLT</td>
                    <td className="mono">1111 1111</td>
                    <td>Stop execution.</td>
                  </tr>
                  <tr>
                    <td>9H</td>
                    <td>25H</td>
                    <td className="mono">0010 0101</td>
                    <td>Input A.</td>
                  </tr>
                  <tr>
                    <td>AH</td>
                    <td>05H</td>
                    <td className="mono">0000 0101</td>
                    <td>Input B.</td>
                  </tr>
                  <tr>
                    <td>BH</td>
                    <td>23H</td>
                    <td className="mono">0010 0011</td>
                    <td>Input C.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The calculation is <span className="mono">25H + 05H = 2AH</span>,
              then <span className="mono">2AH - 23H = 07H</span>. OUT displays{" "}
              <strong>07H</strong> (binary{" "}
              <span className="mono">0000 0111</span>), and the Expected /
              Actual check should show MATCH.
            </p>
            <h3 className="guide-section-title">How execution is shown</h3>
            <p>
              Each instruction takes six T-states in this simulator. T1-T3 fetch
              it: PC sends its address to MAR, PC advances, then RAM loads the
              instruction into IR. T4-T6 execute it: LDA, ADD, and SUB use their
              operand address; OUT copies A to output; HLT stops at T4. Unused
              T-states are shown as NOPs. Use <strong>Micro-step</strong> for
              one T-state, <strong>Step</strong> for one full instruction, or{" "}
              <strong>Run</strong> to continue until HLT. Reset keeps the loaded
              program so you can replay it.
            </p>
            <p>
              Shortcuts: <strong>S</strong> step, <strong>M</strong> micro-step,{" "}
              <strong>P</strong> run / pause, <strong>R</strong> reset.
            </p>
          </div>
        </Modal>
      )}
      {activeTutorialStep && (
        <TutorialHint
          step={activeTutorialStep}
          index={tutorialIndex}
          total={TUTORIAL_STEPS.length}
          onBack={() => setTutorialIndex((index) => Math.max(0, index - 1))}
          onNext={() =>
            setTutorialIndex((index) =>
              index === TUTORIAL_STEPS.length - 1 ? null : index + 1,
            )
          }
          onClose={closeTutorial}
        />
      )}
    </main>
  );
}

export default App;
