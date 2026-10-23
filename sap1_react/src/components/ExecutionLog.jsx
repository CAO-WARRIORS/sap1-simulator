/** @param {{ entries:string[] }} props */
export default function ExecutionLog({ entries }) {
  return (
    <section className="panel log-panel">
      <div className="section-heading">
        <span>06</span>
        <h2>Execution log</h2>
      </div>
      <ol aria-live="polite">
        {entries.slice(-12).map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </section>
  );
}
