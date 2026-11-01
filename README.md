# SAP-1 Simulator

A web-based simulator of the SAP-1 (Simple-As-Possible 1) computer that visualizes registers, the W-Bus, and control signals through the fetch-decode-execute cycle. It is built for Computer Architecture and Organization coursework.

![SAP-1 Simulator](./docs/screenshot.png)

<!-- Add a project screenshot at ./docs/screenshot.png. -->

## Table of Contents

- [1. Features](#1-features)
- [2. Tech Stack and Justification](#2-tech-stack-and-justification)
- [3. Getting Started](#3-getting-started)
- [4. How to Use](#4-how-to-use)
- [5. SAP-1 Architecture](#5-sap-1-architecture)
- [6. Sample Programs](#6-sample-programs)
- [7. Project Structure](#7-project-structure)
- [8. Responsive Design Notes](#8-responsive-design-notes)
- [9. Testing](#9-testing)
- [10. Team Members](#10-team-members)
- [11. Acknowledgments](#11-acknowledgments)

## 1. Features

- 16 x 8-bit RAM viewer with current-address, read, and executed-address highlights.
- PC, MAR, IR with split opcode and operand, Accumulator, B Register, ALU, and Output Register panels.
- Animated W-Bus activity diagram with source, destination, value, and active control signals.
- Eight output LEDs showing the Output Register value.
- `Load Program`, `Step`, `Micro-step`, `Run`, `Pause`, `Reset`, and `Clear RAM` controls.
- Clock speed slider from 100 ms to 1500 ms.
- User-entered instructions and hexadecimal data values through the grid editor or quick-entry parser; program values are not hard-coded.
- Instruction Table showing address, decoded instruction, and binary machine code.
- Ring counter display for T1 through T6.
- Plain white responsive UI for desktop, tablet, and mobile layouts.

## 2. Tech Stack and Justification

- **Language:** JavaScript and JSX
- **Framework:** React `^19.3.1` with Vite `^8.3.5`

React provides component-based register, RAM, editor, control, and output panels with reactive state updates. The reducer-based simulator state updates the interface as each micro-step changes the CPU. Vite provides a fast development server and production build, and the simulator runs entirely in the browser.

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

## 3. Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ for Vite 8 compatibility
- npm, included with Node.js

The project does not define a Node.js engine in `package.json`.

### Installation and development

```bash
git clone <repo-url>
cd <project-folder>
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### Production build and preview

```bash
npm run build
npm run preview
```

### Tests

```bash
npm test
```

## 4. How to Use

1. In **Program Editor**, enter instructions and hexadecimal data values in the grid, or switch to **Quick entry** and enter lines such as `0: LDA 9` and `9: 25H`.
2. Click **Parse entries** when using quick entry, or choose one of the available presets.
3. Click **Load Program** to copy the editor values into RAM.
4. Use **Micro-step** to advance one T-state, **Step** to complete one instruction, or **Run** to advance automatically. While running, the button changes to **Pause**.
5. Adjust the **Clock speed** slider to change the automatic micro-step interval.
6. Watch the W-Bus, active control signals, RAM highlights, registers, instruction table, status text, and T1-T6 ring counter update.
7. Read the result in the **Output Register** and its eight LEDs.
8. Click **Reset** to reset the registers while retaining the loaded RAM program. Use **Clear RAM** to remove the program and return to an empty simulator.

## 5. SAP-1 Architecture

### Components

| Component                     | Size         | Role                                                                                      |
| ----------------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| PC (Program Counter)          | 4 bits       | Selects the next RAM address and advances during fetch.                                   |
| MAR (Memory Address Register) | 4 bits       | Holds the RAM address being accessed.                                                     |
| RAM                           | 16 x 8 bits  | Stores instructions and data at hexadecimal addresses `0H` through `FH`.                  |
| IR (Instruction Register)     | 8 bits       | Holds the fetched byte; its upper 4 bits are the opcode and lower 4 bits are the operand. |
| Accumulator (A)               | 8 bits       | Holds the primary operand and ALU result.                                                 |
| B Register                    | 8 bits       | Holds the second operand for `ADD` and `SUB`.                                             |
| ALU                           | 8-bit result | Adds or subtracts A and B; `Su` selects subtraction.                                      |
| Output Register               | 8 bits       | Receives A during `OUT` and drives the eight output LEDs.                                 |
| Controller-Sequencer          | T1-T6        | Generates the current micro-step and control signals for fetch and execution.             |

### Instruction set

| Instruction | Opcode | Function                                                                 |
| ----------- | ------ | ------------------------------------------------------------------------ |
| `LDA`       | `0000` | Loads the RAM operand into A.                                            |
| `ADD`       | `0001` | Loads the RAM operand into B and adds A and B into A.                    |
| `SUB`       | `0010` | Loads the RAM operand into B and subtracts B from A, wrapping to 8 bits. |
| `OUT`       | `1110` | Copies A to the Output Register.                                         |
| `HLT`       | `1111` | Stops the clock at T4.                                                   |

### T-states and control signals

| T-state | Phase   | Control signals                                                        | Operation                                                            |
| ------- | ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| T1      | Fetch   | `Ep`, `Lm`                                                             | PC places its address on the W-Bus and MAR loads it.                 |
| T2      | Fetch   | `Cp`                                                                   | PC advances to the next 4-bit address.                               |
| T3      | Fetch   | `CE`, `Li`                                                             | RAM places the selected byte on the W-Bus and IR loads it.           |
| T4      | Execute | `Ei`, `Lm` for `LDA`/`ADD`/`SUB`; `Ea`, `Lo` for `OUT`; none for `HLT` | The operand loads MAR, A loads OUT, or HLT stops the clock.          |
| T5      | Execute | `CE`, `La` for `LDA`; `CE`, `Lb` for `ADD`/`SUB`                       | RAM loads A for `LDA`, or B for `ADD`/`SUB`.                         |
| T6      | Execute | `Eu`, `La` for `ADD`; `Eu`, `La`, `Su` for `SUB`                       | The ALU returns the result to A and the instruction cycle completes. |

## 6. Sample Programs

### Program 1: 25H + 05H - 23H = 07H

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
| `3H`    | `OUT`       | `1110 0000`  |
| `4H`    | `HLT`       | `1111 0000`  |
| `9H`    | `DATA 25H`  | `0010 0101`  |
| `AH`    | `DATA 05H`  | `0000 0101`  |
| `BH`    | `DATA 23H`  | `0010 0011`  |

Expected output: `07H`.

### Program 2: Add two numbers

Inputs: `12H + 08H`. Expected output: `1AH`.

| Address | Instruction | Machine code |
| ------- | ----------- | ------------ |
| `0H`    | `LDA 9H`    | `0000 1001`  |
| `1H`    | `ADD AH`    | `0001 1010`  |
| `2H`    | `OUT`       | `1110 0000`  |
| `3H`    | `HLT`       | `1111 0000`  |
| `9H`    | `DATA 12H`  | `0001 0010`  |
| `AH`    | `DATA 08H`  | `0000 1000`  |

### Program 3: Subtract two numbers

Inputs: `20H - 07H`. Expected output: `19H`.

| Address | Instruction | Machine code |
| ------- | ----------- | ------------ |
| `0H`    | `LDA 9H`    | `0000 1001`  |
| `1H`    | `SUB AH`    | `0010 1010`  |
| `2H`    | `OUT`       | `1110 0000`  |
| `3H`    | `HLT`       | `1111 0000`  |
| `9H`    | `DATA 20H`  | `0010 0000`  |
| `AH`    | `DATA 07H`  | `0000 0111`  |

All data values are entered by the user through the program editor or quick-entry interface. The examples correspond to the presets defined in the application.

## 7. Project Structure

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
	└── utils.js             # 4-bit/8-bit masking, binary, hexadecimal, and parsing helpers
```

## 8. Responsive Design Notes

- **Desktop:** A three-column dashboard presents the editor and controls, RAM/W-Bus/output, and registers or the instruction table in a single-screen working layout. The RAM and instruction table provide localized scrolling when needed.
- **Tablet:** At widths below 1200px, the dashboard becomes two columns and the registers/instruction table move across the full width; the status bar also uses two columns.
- **Mobile:** At widths below 768px, panels stack vertically, the header actions expand to full width, the control panel becomes a sticky bottom control surface, and the register, LED, and status layouts adapt to the narrow screen.

## 9. Testing

The Vitest suite tests the sample program result and halt behavior, 8-bit subtraction underflow, 4-bit program-counter wraparound, `OUT` and `HLT` behavior, and malformed quick-entry validation.

Run the tests with:

```bash
npm test
```

## 10. Team Members

| Name     | Role        |
| -------- | ----------- |
| Member 1 | Team member |
| Member 2 | Team member |
| Member 3 | Team member |
| Member 4 | Team member |
| Member 5 | Team member |

## 11. Acknowledgments

- **Course:** Computer Architecture and Organization
- **Instructor:** [Instructor Name]
- **Reference:** Malvino and Brown, _Digital Computer Electronics_
