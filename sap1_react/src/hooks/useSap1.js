import { useEffect, useReducer } from "react";
import { calculateFormula, SAP1 } from "../core/cpu.js";

const MAX_RUN_TSTATES = 6000;

const createInitial = () => {
  const cpu = new SAP1();
  return {
    cpu,
    machine: {
      ...cpu.snapshot(),
      status: "Ready",
      changedRegisters: [],
      instructionCount: 0,
    },
    program: Array(16).fill(0),
    running: false,
    speed: 500,
    errors: [],
    expected: null,
    tStateCount: 0,
    programLoaded: false,
  };
};

const initial = createInitial();

const changedRegisters = (before, after) =>
  ["pc", "mar", "ir", "a", "b", "output"]
    .filter((key) => before[key] !== after[key])
    .map((key) => key.toUpperCase());

const snapshot = (cpu, before, status, instructionCount, overrides = {}) => {
  const machine = cpu.snapshot();
  return {
    ...machine,
    status: machine.error ? "Error" : machine.halted ? "Halted" : status,
    changedRegisters: changedRegisters(before, machine),
    instructionCount,
    ...overrides,
  };
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD": {
      // Loading a program resets CPU execution and the Run T-state budget.
      state.cpu.loadProgram(action.memory);
      const expected = action.formula
        ? calculateFormula(
            action.formula.values[0],
            action.formula.operation2,
            action.formula.values[1],
            action.formula.operation3,
            action.formula.values[2],
          )
        : null;
      return {
        ...state,
        machine: {
          ...state.cpu.snapshot(),
          status: "Ready",
          changedRegisters: [],
          instructionCount: 0,
        },
        program: state.cpu.snapshot().memory,
        errors: action.errors || [],
        expected,
        running: false,
        tStateCount: 0,
        programLoaded: true,
      };
    }
    case "STEP": {
      // Manual Step remains one complete fetch/decode/execute instruction.
      const before = state.machine;
      state.cpu.stepInstruction();
      return {
        ...state,
        machine: snapshot(
          state.cpu,
          before,
          "Running",
          state.machine.instructionCount + 1,
        ),
      };
    }
    case "MICRO_STEP": {
      // Manual T-state stepping advances exactly one CPU micro-operation.
      const before = state.machine;
      state.cpu.stepTState();
      const completed = state.cpu.snapshot().tState === 1;
      return {
        ...state,
        machine: snapshot(
          state.cpu,
          before,
          "Running",
          state.machine.instructionCount + (completed ? 1 : 0),
        ),
        running: false,
      };
    }
    case "TICK": {
      // Automatic Run advances one T-state so the bus can be observed live.
      if (state.machine.halted || state.machine.error) {
        return { ...state, running: false };
      }
      const before = state.machine;
      state.cpu.stepTState();
      const tStateCount = state.tStateCount + 1;
      const safetyLimit =
        tStateCount >= MAX_RUN_TSTATES &&
        !state.cpu.snapshot().halted &&
        !state.cpu.snapshot().error;
      const machine = snapshot(
        state.cpu,
        before,
        "Running",
        state.machine.instructionCount +
          (state.cpu.snapshot().tState === 1 ? 1 : 0),
        safetyLimit
          ? {
              status: "Error",
              error:
                "Run stopped: safety limit reached (possible infinite loop)",
            }
          : {},
      );
      return {
        ...state,
        machine,
        running: !machine.halted && !machine.error && !safetyLimit,
        tStateCount,
      };
    }
    case "RUN":
      // Run starts the T-state clock; the effect below owns its cleanup.
      return {
        ...state,
        running: !state.machine.halted && !state.machine.error,
      };
    case "PAUSE":
      return { ...state, running: false };
    case "RESET": {
      // Reset registers and execution state while restoring the loaded RAM image.
      const resetMachine = state.cpu.loadProgram(state.program);
      return {
        ...createInitial(),
        cpu: state.cpu,
        machine: {
          ...resetMachine,
          status: "Ready",
          changedRegisters: [],
          instructionCount: 0,
        },
        program: state.program,
        expected: state.expected,
        programLoaded: state.programLoaded,
      };
    }
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    default:
      return state;
  }
}

/** @returns {{ state: object, actions: object, loadProgram: Function }} */
export function useSap1() {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => {
    if (!state.running) return undefined;
    const timer = window.setInterval(
      () => dispatch({ type: "TICK" }),
      state.speed,
    );
    return () => window.clearInterval(timer);
  }, [state.running, state.speed]);
  const loadProgram = (memory, formula) =>
    dispatch({ type: "LOAD", memory, formula });
  return {
    state,
    actions: {
      step: () => dispatch({ type: "STEP" }),
      microStep: () => dispatch({ type: "MICRO_STEP" }),
      run: () => dispatch({ type: "RUN" }),
      pause: () => dispatch({ type: "PAUSE" }),
      reset: () => dispatch({ type: "RESET" }),
      setSpeed: (speed) => dispatch({ type: "SET_SPEED", speed }),
    },
    loadProgram,
  };
}
