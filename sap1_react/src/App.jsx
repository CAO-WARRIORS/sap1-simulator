import "./App.css";
import BusDiagram from "./components/BusDiagram.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import ControlSignals from "./components/ControlSignals.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ExecutionLog from "./components/ExecutionLog.jsx";
import LedRow from "./components/LedRow.jsx";
import MemoryTable from "./components/MemoryTable.jsx";
import ProgramLoader from "./components/ProgramLoader.jsx";
import RegisterGrid from "./components/RegisterGrid.jsx";
import ResultCheck from "./components/ResultCheck.jsx";
import { useSap1 } from "./hooks/useSap1.js";

export default function App() {
  const { state, actions, loadFormula, loadCustom } = useSap1();
  const { machine } = state;
  const status =
    machine.status === "Running" || state.running ? "Running" : machine.status;
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
            <ProgramLoader
              onFormula={loadFormula}
              onCustom={loadCustom}
              errors={state.errors}
            />
            <ResultCheck
              expected={state.expected}
              actual={machine.output}
              status={machine.status}
            />
            <ControlPanel
              actions={actions}
              running={state.running}
              halted={machine.status === "Halted" || machine.status === "Error"}
              speed={state.speed}
            />
          </aside>
          <section className="machine-view">
            <RegisterGrid machine={machine} />
            <LedRow value={machine.output} />
            <ControlSignals activeSignals={machine.activeSignals} />
            <BusDiagram
              source={machine.busSource}
              destination={machine.busDestination}
              value={machine.busValue}
            />
            <MemoryTable
              memory={machine.memory}
              pc={machine.pc}
              mar={machine.mar}
            />
            <ExecutionLog entries={machine.log} />
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
