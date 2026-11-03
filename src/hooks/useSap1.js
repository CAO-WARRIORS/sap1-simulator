import { useEffect, useReducer } from "react";
import {
  createInitialState,
  loadProgram,
  microStep,
  reset,
  step,
} from "../sap1/cpu.js";
import { DEFAULT_CLOCK_SPEED, MAX_CYCLES } from "../sap1/config.js";
function reducer(state, action) {
  switch (action.type) {
    case "load":
      return loadProgram(state, action.ram, action.entries);
    case "micro":
      return microStep(state);
    case "step":
      return step(state);
    case "reset":
      return reset(state);
    case "clear":
      return { ...createInitialState(), status: "RAM cleared." };
    case "run":
      return { ...state, running: true };
    case "pause":
      return { ...state, running: false, status: "Paused." };
    case "speed":
      return { ...state, speed: action.value || DEFAULT_CLOCK_SPEED };
    default:
      return state;
  }
}
export function useSap1() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  useEffect(() => {
    if (!state.running || state.halted) return undefined;
    const timer = setInterval(
      () => dispatch({ type: "micro" }),
      state.speed || DEFAULT_CLOCK_SPEED,
    );
    return () => clearInterval(timer);
  }, [state.running, state.halted, state.speed, state.cycleCount]);
  useEffect(() => {
    if (state.cycleCount >= MAX_CYCLES && state.running)
      dispatch({ type: "pause" });
  }, [state.cycleCount, state.running]);
  return { state, dispatch };
}
