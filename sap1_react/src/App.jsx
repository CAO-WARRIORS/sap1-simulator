import "./App.css";
import AdderSubtractor from "./components/AdderSubtractor.jsx";
import ControllerPanel from "./components/ControllerPanel.jsx";
import ControlsPanel from "./components/ControlsPanel.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import IRPanel from "./components/IRPanel.jsx";
import OutputLEDs from "./components/OutputLEDs.jsx";
import ProgramLoader from "./components/ProgramLoader.jsx";
import RamViewer from "./components/RamViewer.jsx";
import RegisterPanel from "./components/RegisterPanel.jsx";
import ResultCheck from "./components/ResultCheck.jsx";
import WBus from "./components/WBus.jsx";
import { useSap1 } from "./hooks/useSap1.js";

export default function App() {
  const { state, actions, loadProgram } = useSap1();
  const { machine } = state;
  const status = state.running ? "Running" : machine.status;
  const opcode = (machine.ir >> 4) & 0x0f;
  const arithmeticMode = opcode === 2 ? "SUB" : "ADD";
  return (
    <ErrorBoundary>
      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">COMPUTER ARCHITECTURE / FINAL PROJECT</p>
            <h1>
              SAP-1 <em>Studio</em>
            </h1>
            <p className="intro">
              A visible fetch-decode-execute machine. Every register, bus
              transfer, and control signal is yours to inspect.
            </p>
          </div>
          <div
            className={`status-badge status-${status.toLowerCase()}`}
            aria-live="polite"
          >
            <i></i>
            {status}
          </div>
        </header>
        <div className="workspace">
          <aside className="sidebar">
            <ProgramLoader onLoadProgram={loadProgram} errors={state.errors} />
            <ResultCheck
              expected={state.expected}
              actual={machine.output}
              status={machine.status}
            />
            <ControlsPanel
              onStep={actions.step}
              onStepTState={actions.microStep}
              onRun={actions.run}
              onReset={actions.reset}
              programLoaded={state.programLoaded}
              running={state.running}
              halted={machine.halted || machine.error !== null}
              speed={state.speed}
              onSpeedChange={actions.setSpeed}
            />
          </aside>
          <section className="machine-view">
            <WBus
              source={machine.busSource}
              destination={machine.busDestination}
              value={machine.busValue}
            />
            <div className="hardware-chain">
              <RegisterPanel
                name="PC"
                value={machine.pc}
                width={4}
                changed={machine.changedRegisters.includes("PC")}
              />
              <RegisterPanel
                name="MAR"
                value={machine.mar}
                width={4}
                changed={machine.changedRegisters.includes("MAR")}
              />
              <RamViewer
                memory={machine.memory}
                pc={machine.pc}
                accessedAddress={machine.mar}
              />
              <IRPanel
                value={machine.ir}
                changed={machine.changedRegisters.includes("IR")}
              />
              <ControllerPanel
                tState={machine.tState}
                instruction={machine.ir}
                activeSignals={machine.activeSignals}
                halted={machine.halted}
              />
              <RegisterPanel
                name="Accumulator (A)"
                value={machine.a}
                changed={machine.changedRegisters.includes("A")}
              />
              <AdderSubtractor
                value={machine.a}
                mode={arithmeticMode}
                enabled={machine.activeSignals.includes("Eu")}
              />
              <RegisterPanel
                name="B Register"
                value={machine.b}
                changed={machine.changedRegisters.includes("B")}
              />
              <RegisterPanel
                name="Output Register"
                value={machine.output}
                changed={machine.changedRegisters.includes("OUTPUT")}
              />
              <OutputLEDs value={machine.output} />
            </div>
            {machine.error && (
              <div className="error-box error-box--large" role="alert">
                {machine.error}
              </div>
            )}
          </section>
        </div>
      </main>
    </ErrorBoundary>
  );
}
