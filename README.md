# SAP-1 Simulator

A web-based simulator of the SAP-1 (Simple-As-Possible 1) computer. It visualizes the registers, W-Bus, RAM, control signals and output LEDs in the browser while running SAP-1 machine language programs through the fetch-decode-execute cycle. It was built for Computer Architecture and Organization.

![SAP-1 Simulator](./docs/screenshot.png)

<!-- Add a project screenshot at ./docs/screenshot.png. -->

**Demo video:** [Watch the demonstration](palagay url)

## Table of Contents

- [1. Language and Web Framework](#1-language-and-web-framework)
- [2. Installation and Running](#2-installation-and-running)
- [3. Demonstration](#3-demonstration)
- [4. Features](#4-features)
- [5. How to Use](#5-how-to-use)
- [6. SAP-1 Architecture](#6-sap-1-architecture)
- [7. Sample Programs](#7-sample-programs)
- [8. Project Structure](#8-project-structure)
- [9. Testing](#9-testing)
- [10. Team Members](#10-team-members)
- [11. Acknowledgments](#11-acknowledgments)

## 1. Language and Web Framework

- **Language:** JavaScript (JSX)
- **Framework:** React `^19.3.1`, built with Vite `^8.3.5`

### Justification

- **Component-based UI:** Each part of the SAP-1 block diagram (PC, MAR, IR, Accumulator, B Register, Output Register, RAM viewer, output LEDs, controls) is its own React component. The code therefore mirrors the architecture diagram.
- **Reactive state:** The simulator state is held in a reducer. Every micro-step updates the CPU state, and React re-renders the registers, RAM highlights, W-Bus and LEDs automatically, so the display is always in sync with the logic.
- **Fast tooling:** Vite provides a quick development server and a production build.
- **Browser-only:** The simulator runs entirely in the browser with no backend, and uses real graphical components (buttons, panels, LEDs), not a terminal interface.

### Dependencies

| Package     | Version   | Purpose                                     |
| ----------- | --------- | ------------------------------------------- |
| `react`     | `^19.3.1` | UI components and stateful rendering        |
| `react-dom` | `^19.3.1` | Mounts the React application in the browser |

### DevDependencies

| Package                       | Version    | Purpose                                    |
| ----------------------------- | ---------- | ------------------------------------------ |
| `@eslint/js`                  | `^10.0.1`  | ESLint JavaScript configuration            |
| `@types/react`                | `^19.3.0`  | React type definitions used by tooling     |
| `@types/react-dom`            | `^19.3.0`  | React DOM type definitions used by tooling |
| `@vitejs/plugin-react`        | `^6.1.2`   | React support for Vite                     |
| `eslint`                      | `^10.13.0` | JavaScript linting                         |
| `eslint-plugin-react-hooks`   | `^7.1.1`   | React Hooks lint rules                     |
| `eslint-plugin-react-refresh` | `^0.5.7`   | React Refresh lint support                 |
| `globals`                     | `^17.13.0` | Global environment definitions for ESLint  |
| `vite`                        | `^8.3.5`   | Development server and production bundler  |
| `vitest`                      | `^5.0.5`   | Unit test runner                           |

## 2. Installation and Running

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- npm (included with Node.js)
- A modern web browser (Chrome, Firefox or Edge)

### Install dependencies

```bash
git clone <repo-url>
cd <project-folder>
npm install
```

### Run the application

```bash
npm run dev
```

Open the local URL printed in the terminal, usually `http://localhost:5173`.

### Production build (optional)

```bash
npm run build
npm run preview
```

## 3. Demonstration

**Recorded demo:** [add link to video]

The demo shows the simulator computing three different formulas, with the values typed in by the user and each result shown on the 8-LED output display:

| #   | Formula         | Result | LEDs        |
| --- | --------------- | ------ | ----------- |
| 1   | 25H + 05H - 23H | `07H`  | `0000 0111` |
| 2   | 12H + 08H       | `1AH`  | `0001 1010` |
| 3   | 20H - 07H       | `19H`  | `0001 1001` |

## 4. Features

- 16 x 8-bit RAM viewer with current-address, read and executed-address highlights.
- Separate panels for PC, MAR, IR (split into opcode and operand), Accumulator, B Register, ALU and Output Register, with values in binary and hexadecimal.
- Animated W-Bus diagram showing source, destination, value and active control signals.
- Eight output LEDs showing the Output Register in binary.
- Ring counter display for T1 through T6.
- Instruction Table showing address, decoded instruction and binary machine code.
- Controls: `Load Program`, `Step`, `Micro-step`, `Run`, `Pause`, `Reset` and `Clear RAM`.
- Clock speed slider from 100 ms to 1500 ms.
- Instructions and hexadecimal data are entered by the user through the quick-entry parser. No program values are hard-coded.
- Responsive layout for desktop (three columns), tablet (below 1200px, two columns) and mobile (below 768px, stacked panels with a sticky control bar).

## 5. How to Use

1. In **Program Editor**, enter instructions and hexadecimal data values in Quick entry, using lines such as `0: LDA 9` and `9: 25H`.
2. Click **Parse entries**, or choose one of the presets.
3. Click **Load Program** to copy the editor values into RAM.
4. Run the program:
   - **Micro-step** advances one T-state.
   - **Step** completes one instruction.
   - **Run** advances automatically until `HLT`, and changes to **Pause** while running.
5. Adjust the **Clock speed** slider to change the automatic run speed.
6. Watch the W-Bus, control signals, RAM highlights, registers, instruction table and T1-T6 ring counter update.
7. Read the result in the **Output Register** and its eight LEDs.
8. Click **Reset** to clear the registers while keeping the loaded program. Click **Clear RAM** to remove the program.

## 6. SAP-1 Architecture

### Components

| Component                     | Size         | Role                                                                               |
| ----------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| PC (Program Counter)          | 4 bits       | Selects the next RAM address and increments after each fetch.                      |
| MAR (Memory Address Register) | 4 bits       | Holds the RAM address being accessed.                                              |
| RAM                           | 16 x 8 bits  | Stores instructions and data at addresses `0H` through `FH`.                       |
| IR (Instruction Register)     | 8 bits       | Holds the fetched byte; upper 4 bits are the opcode, lower 4 bits are the operand. |
| Accumulator (A)               | 8 bits       | Holds the primary operand and the ALU result.                                      |
| B Register                    | 8 bits       | Holds the second operand for `ADD` and `SUB`.                                      |
| Adder/Subtractor              | 8-bit result | Adds or subtracts A and B using 2's complement; `Su` selects subtraction.          |
| Output Register               | 8 bits       | Receives A during `OUT` and drives the eight output LEDs.                          |
| Controller-Sequencer          | T1-T6        | Decodes the instruction and generates the control signals for each T-state.        |

### Instruction set

| Instruction | Opcode | Function                                                         |
| ----------- | ------ | ---------------------------------------------------------------- |
| `LDA`       | `0000` | Load Accumulator from memory.                                    |
| `ADD`       | `0001` | Add memory value to Accumulator.                                 |
| `SUB`       | `0010` | Subtract memory value from Accumulator (result wraps to 8 bits). |
| `OUT`       | `1110` | Output Accumulator value.                                        |
| `HLT`       | `1111` | Halt execution.                                                  |

### T-states and control signals

| T-state | Phase   | Control signals                                                        | Operation                                                            |
| ------- | ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| T1      | Fetch   | `Ep`, `Lm`                                                             | PC places its address on the W-Bus and MAR loads it.                 |
| T2      | Fetch   | `Cp`                                                                   | PC advances to the next 4-bit address.                               |
| T3      | Fetch   | `CE`, `Li`                                                             | RAM places the selected byte on the W-Bus and IR loads it.           |
| T4      | Execute | `Ei`, `Lm` for `LDA`/`ADD`/`SUB`; `Ea`, `Lo` for `OUT`; none for `HLT` | The operand loads MAR, A loads OUT, or HLT stops the clock.          |
| T5      | Execute | `CE`, `La` for `LDA`; `CE`, `Lb` for `ADD`/`SUB`                       | RAM loads A for `LDA`, or B for `ADD`/`SUB`.                         |
| T6      | Execute | `Eu`, `La` for `ADD`; `Eu`, `La`, `Su` for `SUB`                       | The ALU returns the result to A and the instruction cycle completes. |

## 7. Sample Programs

The values below are entered by the user through the program editor or quick-entry interface. They are not hard-coded.

### Program 1: 25H + 05H - 23H

Quick-entry format:

```text
0: LDA 9
1: ADD A
2: SUB B
3: OUT
4: HLT
9: 25H
A: 05H
B: 23H
```

| Address | Instruction | Machine code |
| ------- | ----------- | ------------ |
| `0H`    | `LDA 9H`    | `0000 1001`  |
| `1H`    | `ADD AH`    | `0001 1010`  |
| `2H`    | `SUB BH`    | `0010 1011`  |
| `3H`    | `OUT`       | `1110 1111`  |
| `4H`    | `HLT`       | `1111 1111`  |
| `9H`    | `DATA 25H`  | `0010 0101`  |
| `AH`    | `DATA 05H`  | `0000 0101`  |
| `BH`    | `DATA 23H`  | `0010 0011`  |

**Expected output:** `07H` (`0000 0111`)

The lower nibble of `OUT` and `HLT` is not used by the controller.

### Program 2: 12H + 08H

| Address | Instruction | Machine code |
| ------- | ----------- | ------------ |
| `0H`    | `LDA 9H`    | `0000 1001`  |
| `1H`    | `ADD AH`    | `0001 1010`  |
| `2H`    | `OUT`       | `1110 1111`  |
| `3H`    | `HLT`       | `1111 1111`  |
| `9H`    | `DATA 12H`  | `0001 0010`  |
| `AH`    | `DATA 08H`  | `0000 1000`  |

**Expected output:** `1AH` (`0001 1010`)

### Program 3: 20H - 07H

| Address | Instruction | Machine code |
| ------- | ----------- | ------------ |
| `0H`    | `LDA 9H`    | `0000 1001`  |
| `1H`    | `SUB AH`    | `0010 1010`  |
| `2H`    | `OUT`       | `1110 1111`  |
| `3H`    | `HLT`       | `1111 1111`  |
| `9H`    | `DATA 20H`  | `0010 0000`  |
| `AH`    | `DATA 07H`  | `0000 0111`  |

**Expected output:** `19H` (`0001 1001`)

## 8. Project Structure

```text
src/
├── App.jsx                 # Simulator dashboard, editor, controls, panels, and modals
├── App.css                 # Dashboard, panel, responsive, and animation styles
├── index.css               # Global typography, colors, and focus styles
├── main.jsx                # React application entry point
├── assets/
│   ├── hero.png            # Project image asset
│   ├── react.svg           # React asset
│   └── vite.svg            # Vite asset
├── hooks/
│   └── useSap1.js          # Reducer-backed simulator state and run clock
└── sap1/
    ├── cpu.js              # CPU state, loading, reset, micro-steps, and instructions
    ├── instructions.js     # Opcodes, control signals, decoding, and formatting
    ├── parser.js           # Quick-entry parsing and validation
    ├── presets.js          # Three editable sample programs
    ├── sap1.test.js        # Vitest tests for CPU and parser behavior
    └── utils.js            # 4-bit/8-bit masking, binary, hexadecimal, and parsing helpers
```

## 9. Testing

```bash
npm test
```

The Vitest suite covers:

- the sample program result and halt behavior
- 8-bit subtraction underflow
- 4-bit program-counter wraparound
- `OUT` and `HLT` behavior
- malformed quick-entry validation

## 10. Team Members

| Name                             | Role                                                |
| -------------------------------- | --------------------------------------------------- |
| Cabuhat, Dave Ronald G.          | Documentation and demo video                        |
| Carreon, Dustin Howell S.        | Project lead and GUI: dashboard, W-Bus, and ALU     |
| Dela Cruz, Christian Lance C.    | UI/UX Designer, Decoder                             |
| Panganiban, Nelson DC.           | Testing and QA                                      |
| Tudlasan, Jhon Marvic Vincent C. | CPU logic: registers, LEDs and controller-sequencer |

## 11. Acknowledgments

- **Course:** Computer Architecture and Organization
- **Instructor:** Madelyn Adelaida B. De Guzman
- **Reference:** Malvino and Brown, _Digital Computer Electronics_
