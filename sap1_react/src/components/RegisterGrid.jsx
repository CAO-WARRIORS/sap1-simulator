import RegisterPanel from "./RegisterPanel.jsx";

/** @param {{ machine:object }} props */
export default function RegisterGrid({ machine }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <span>01</span>
        <h2>Registers</h2>
      </div>
      <div className="register-grid">
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
        <RegisterPanel
          name="IR"
          value={machine.ir}
          changed={machine.changedRegisters.includes("IR")}
        />
        <RegisterPanel
          name="Accumulator"
          value={machine.a}
          changed={machine.changedRegisters.includes("A")}
        />
        <RegisterPanel
          name="B Register"
          value={machine.b}
          changed={machine.changedRegisters.includes("B")}
        />
        <RegisterPanel
          name="Output"
          value={machine.output}
          changed={machine.changedRegisters.includes("OUT")}
        />
      </div>
      <div className="state-strip">
        <span>
          T-state <b>T{machine.tState}</b>
        </span>
        <span>
          Instruction{" "}
          <b>
            {machine.ir >> 4 === 14
              ? "OUT"
              : machine.ir >> 4 === 15
                ? "HLT"
                : machine.ir >> 4 === 0
                  ? "LDA"
                  : machine.ir >> 4 === 1
                    ? "ADD"
                    : machine.ir >> 4 === 2
                      ? "SUB"
                      : "???"}
          </b>
        </span>
        <span className="flag">
          Carry / overflow <b>{machine.carry ? "1" : "0"}</b>
        </span>
      </div>
    </section>
  );
}
