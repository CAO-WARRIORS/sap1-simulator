/** Machine controls: delegates loading, stepping, running, and reset to callers. */
export default function ControlsPanel({
  onStep,
  onStepTState,
  onRun,
  onReset,
  programLoaded = false,
  running = false,
  halted = false,
  speed,
  onSpeedChange,
}) {
  return (
    <section className="control-panel controls-panel">
      <button
        type="button"
        onClick={onStep}
        disabled={!programLoaded || running || halted}
      >
        Step
      </button>
      <button
        type="button"
        onClick={onStepTState}
        disabled={!programLoaded || running || halted}
      >
        Step T-state
      </button>
      <button
        type="button"
        onClick={onRun}
        disabled={!programLoaded || running || halted}
      >
        Run
      </button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
      {!programLoaded && <p className="control-hint">Load a program first</p>}
      <p className="reset-note">
        Reset keeps the loaded program. Load again to change values.
      </p>
      {speed !== undefined && onSpeedChange && (
        <label className="speed">
          Clock speed{" "}
          <input
            type="range"
            min="100"
            max="1200"
            step="100"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
        </label>
      )}
    </section>
  );
}
