# SAP-1 Studio

SAP-1 Studio is a browser-based visual simulator for the Simple-As-Possible 1 computer. It shows the six T-states, registers, 16 x 8 RAM, W-Bus transfers, control signals, arithmetic carry state, and eight output LEDs while executing a program.
![Screenshot placeholder](docs/sap1-studio.png)

## Features

- 4-bit PC and MAR, 8-bit IR, accumulator, B register, and output register.
- 16 memory locations with binary, hexadecimal, disassembly, PC pointer, and MAR access highlighting.
- Pure SAP-1 engine separated from React rendering, including immutable state transitions and T1-T6 micro-steps.
- LDA, ADD, SUB, OUT, HLT, illegal-opcode errors, 8-bit masking, and two's-complement subtraction.
- Formula loader with independent `Operation 2` and `Operation 3` ADD/SUB dropdowns for `A + B - C`, `A + B + C`, `A - B - C`, and `A - B + C`.
- Custom assembly or eight-bit machine-code loader with line-level errors.
- Run ticks one T-state per clock interval, stops at HLT or errors, and has a 6000-T-state safety limit. Instruction step, micro-step, reset, clock speed, signal lamps, and output LEDs are also available.
- Keyboard-accessible controls, focus states, live status updates, responsive layout, and reduced-motion support.

## Language And Framework

React + Vite + plain JavaScript keeps the project simple for a five-member team, with no extra compile step; bit widths are enforced in the engine with masks and verified by unit tests.

## Installation And Commands

Prerequisite: Node.js 18 or newer.

```bash
npm install
npm run dev
npm run build
npm run preview
npm test
```

Open the local Vite URL printed by `npm run dev`.

## User Guide

1. Enter hexadecimal A, B, and C data values and choose the `Operation 2` and `Operation 3` ADD/SUB dropdowns.
2. Select Load program. The memory image is placed at addresses `0H` through `FH`; data addresses must be distinct and from `5H` through `FH`.
3. Use Step instruction to complete one fetch-decode-execute instruction, or Micro-step to advance one T-state.
4. Use Run to execute one T-state per clock interval until HLT. Reset clears execution state while keeping the loaded program in RAM.
5. Compare Expected and Actual in the result panel. The expected result is shown in hex and binary, and the output LEDs show bit 7 through bit 0.

## Instruction Set

| Mnemonic   | Opcode | Function                                            |
| ---------- | ------ | --------------------------------------------------- |
| `LDA addr` | `0000` | `A <- RAM[addr]`                                    |
| `ADD addr` | `0001` | `B <- RAM[addr]; A <- A + B`                        |
| `SUB addr` | `0010` | `B <- RAM[addr]; A <- A - B` using two's complement |
| `OUT`      | `1110` | `Output <- A`; machine code `1110 1111`             |
| `HLT`      | `1111` | Stop the clock; machine code `1111 1111`            |

Unknown opcodes stop with a visible Illegal opcode error.

## Sample Memory Map

For `25H + 05H - 23H`:

| Address | Machine code | Meaning  |
| ------- | ------------ | -------- |
| `0H`    | `0000 1001`  | `LDA 9H` |
| `1H`    | `0001 1010`  | `ADD AH` |
| `2H`    | `0010 1011`  | `SUB BH` |
| `3H`    | `1110 1111`  | `OUT`    |
| `4H`    | `1111 1111`  | `HLT`    |
| `9H`    | `0010 0101`  | `25H`    |
| `AH`    | `0000 0101`  | `05H`    |
| `BH`    | `0010 0011`  | `23H`    |

## T-State And Control Signals

| T-state        | Operation           | Active signals |
| -------------- | ------------------- | -------------- |
| T1             | `MAR <- PC`         | `Ep, Lm`       |
| T2             | `PC <- PC + 1`      | `Cp`           |
| T3             | `IR <- RAM[MAR]`    | `CE, Li`       |
| T4 LDA/ADD/SUB | `MAR <- IR operand` | `Ei, Lm`       |
| T5 LDA         | `A <- RAM[MAR]`     | `CE, La`       |
| T5 ADD/SUB     | `B <- RAM[MAR]`     | `CE, Lb`       |
| T6 ADD         | `A <- A + B`        | `Eu, La`       |
| T6 SUB         | `A <- A - B`        | `Eu, La, Su`   |
| T4 OUT         | `Output <- A`       | `Ea, Lo`       |
| T4 HLT         | Stop clock          | `HLT`          |

The controller signal set is `Ep, Lm, CE, Li, Ei, La, Ea, Eu, Su, Lb, Lo, Cp, HLT`. During T4 of LDA, ADD, and SUB, `Ei` enables the IR operand onto the W-Bus and `Lm` loads that operand into MAR.

## Worked Formula Examples

- `25H + 05H - 23H = 07H` (`0000 0111`).
- `10H + 20H + 05H = 35H` (`0000 0101` is not used; the output is `0011 0101`).
- `10H + 20H + 05H = 35H` (`0011 0101`).
- `40H - 10H - 05H = 2BH`.

All arithmetic is masked to eight bits. For example, `05H - 23H = E2H`; the simulator displays `E2H`, decimal `226`, and the carry/overflow flag.

## Project Structure

```text
sap1_react/
	index.html
	package.json
	package-lock.json
	vite.config.js
	src/
		main.jsx
		App.jsx
		App.css
		index.css
		hooks/useSap1.js
		components/*.jsx
		engine/constants.js
		engine/format.js
		engine/assembler.js
		engine/sap1.js
		engine/__tests__/sap1.test.js
```

## Suggested Five-Member Task Split

| Member | Responsibility                                               |
| ------ | ------------------------------------------------------------ |
| 1      | Engine state, microcode, arithmetic, and safety limits       |
| 2      | Assembler, formula compiler, and unit tests                  |
| 3      | Register, RAM, status, and control-panel UI                  |
| 4      | SVG bus, signal lamps, LEDs, and responsive styling          |
| 5      | README, demo recording, integration QA, and final submission |

## Demo Recording Script: 3-4 Minutes

1. Introduce the register grid, RAM table, control lamps, W-Bus, output LEDs, and status badge.
2. Enter `25`, `05`, and `23` in HEX, select `A + B - C`, and load the program.
3. Use Micro-step through T1-T6 for `LDA 9H`, narrating PC to MAR, PC increment, RAM to IR, operand to MAR, RAM to A, and the no-op T6.
4. Use Step instruction for the ADD, SUB, and OUT instructions, pointing to the active lamps and execution log.
5. Run until HLT and show `07H`, `0000 0111`, PASS, and the stopped status.
6. Reset, demonstrate `A + B + C`, then `A - B - C`, and show the updated LED values.
7. Briefly load a custom program or illegal opcode to demonstrate validation and defensive error handling.

## Git Workflow

```bash
git init
git add .
git commit -m "build SAP-1 simulator engine"
git commit -am "add visual simulator controls and memory view"
git commit -am "document demo and final submission"
git branch -M main
git remote add origin https://github.com/TEAM/sap1-studio.git
git push -u origin main
```

## Final Submission Checklist

- [ ] GitHub repository link is included in the submission.
- [ ] README includes setup, architecture, examples, team split, and demo script.
- [ ] Recorded 3-4 minute GUI demonstration is uploaded.
- [ ] `npm install`, `npm run build`, and `npm test` succeed.
- [ ] The final submission is checked before the deadline: October 30, 2026.

## License

MIT. See `LICENSE`.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
