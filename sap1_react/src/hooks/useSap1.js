import { useEffect, useReducer } from "react";
import {
  assemble,
  compileFormula,
  expectedFormula,
} from "../engine/assembler.js";
import {
  createInitialState,
  loadProgram,
  microStep,
  stepInstruction,
} from "../engine/sap1.js";
const initial = {
  machine: createInitialState(),
  running: false,
  speed: 500,
  program: Array(16).fill(0),
  errors: [],
  expected: null,
  formula: "add-sub",
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD": {
      const loaded = loadProgram(state.machine, action.memory);
      return {
        ...state,
        machine: loaded,
        program: loaded.memory,
        errors: action.errors || [],
        expected: action.expected ?? null,
        formula: action.formula || state.formula,
        running: false,
      };
    }
    case "STEP":
      return {
        ...state,
        machine: stepInstruction(state.machine),
        running: false,
      };
    case "MICRO_STEP":
      return {
        ...state,
        machine: microStep(state.machine).state,
        running: false,
      };
    case "RUN":
      return {
        ...state,
        running:
          state.machine.status !== "Halted" && state.machine.status !== "Error",
      };
    case "PAUSE":
      return { ...state, running: false };
    case "RESET":
      return {
        ...initial,
        program: state.program,
        expected: state.expected,
        formula: state.formula,
      };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    default:
      return state;
  }
}

/** @returns {{ state: object, actions: object, loadFormula: Function, loadCustom: Function }} */
export function useSap1() {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => {
    if (!state.running) return undefined;
    const timer = window.setInterval(
      () => dispatch({ type: "STEP" }),
      state.speed,
    );
    return () => window.clearInterval(timer);
  }, [state.running, state.speed]);
  useEffect(() => {
    if (
      state.running &&
      (state.machine.status === "Halted" ||
        state.machine.status === "Error" ||
        state.machine.instructionCount >= 1000)
    )
      dispatch({ type: "PAUSE" });
  }, [state.running, state.machine.status, state.machine.instructionCount]);
  const loadFormula = (a, b, c, formula) =>
    dispatch({
      type: "LOAD",
      memory: compileFormula(a, b, c, formula),
      expected: expectedFormula(a, b, c, formula),
      formula,
    });
  const loadCustom = (source) => {
    const result = assemble(source);
    dispatch({
      type: "LOAD",
      memory: result.memory,
      errors: result.errors,
      expected: null,
      formula: "custom",
    });
  };
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
    loadFormula,
    loadCustom,
  };
}
