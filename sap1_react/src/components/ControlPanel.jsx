/** @param {{ actions:object, running:boolean, halted:boolean, speed:number }} props */
export default function ControlPanel({ actions, running, halted, speed }) {
  return (
    <section className="control-panel">
      <button
        className="primary-button"
        type="button"
        onClick={actions.step}
        disabled={halted || running}
      >
        Step instruction
      </button>
      <button
        type="button"
        onClick={actions.microStep}
        disabled={halted || running}
      >
        Micro-step
      </button>
      {running ? (
        <button type="button" onClick={actions.pause}>
          Pause
        </button>
      ) : (
        <button type="button" onClick={actions.run} disabled={halted}>
          Run
        </button>
      )}
      <button type="button" onClick={actions.reset}>
        Reset
      </button>
      <label className="speed">
        Speed{" "}
        <input
          type="range"
          min="100"
          max="1200"
          step="100"
          value={speed}
          onChange={(event) => actions.setSpeed(Number(event.target.value))}
        />
        {speed} ms
      </label>
    </section>
  );
}
