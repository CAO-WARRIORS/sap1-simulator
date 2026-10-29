# SAP-1 Studio

SAP-1 Studio is a browser-based visual simulator for the Simple-As-Possible 1 computer. It visualizes registers, 16 x 8 RAM, the W-Bus, control signals, T-states, arithmetic flags, and the eight-bit output while a program executes.

![Screenshot placeholder](sap1_react/docs/sap1-studio.png)

The application source is in [`sap1_react`](sap1_react/). All commands below should be run from that directory.

## Features

- 4-bit Program Counter and Memory Address Register.
- 8-bit Instruction Register, Accumulator, B Register, and Output Register.
- 16 memory locations with binary, hexadecimal, disassembly, PC pointer, and MAR highlighting.
- Pure SAP-1 engine separated from React rendering, with immutable state transitions and T1-T6 micro-steps.
- LDA, ADD, SUB, OUT, HLT, illegal-opcode errors, eight-bit masking, and two's-complement subtraction.
- Formula loader with independent `Operation 2` and `Operation 3` ADD/SUB dropdowns for `A + B - C`, `A + B + C`, `A - B - C`, and `A - B + C`.
- Validated hexadecimal data and memory-address inputs from `5H` through `FH`.
- Run advances one T-state per clock interval, stops at HLT or CPU errors, and has a 6000-T-state safety limit. Instruction step, micro-step, reset, adjustable clock speed, signal lamps, and output LEDs are also available.
- Keyboard-accessible controls, visible focus states, live status updates, responsive layout, and reduced-motion support.

## Language And Framework

React + Vite + plain JavaScript keeps the project simple for a five-member team, with no extra compile step; bit widths are enforced in the engine with masks and verified by unit tests.

## Installation And Commands

Prerequisite: Node.js 18 or newer.

```bash
cd sap1_react
npm install
npm run dev
```

Other project commands:

```bash
npm run build
npm run preview
npm test
```

Open the local Vite URL printed by `npm run dev`.

## User Guide

1. Enter hexadecimal A, B, and C data values and choose the `Operation 2` and `Operation 3` ADD/SUB dropdowns.
2. Select Load program. Instructions occupy `0H` through `4H`; data addresses must be distinct and from `5H` through `FH`.
3. Use Step instruction to complete one fetch-decode-execute instruction.
4. Use Step T-state to advance one micro-operation and inspect the active control signals and W-Bus transfer.
5. Use Run to advance one T-state per clock interval until HLT, an error, or the safety limit.
6. Use Reset to clear registers, output, bus, signals, and execution state while keeping the loaded program in RAM.
7. Compare Expected and Actual in the result panel. Expected values are shown in hex and binary, and the output LEDs show bit 7 through bit 0.

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
- `10H + 20H + 05H = 35H` (`0011 0101`).
- `40H - 10H - 05H = 2BH`.

Arithmetic is masked to eight bits. For example, `05H - 23H = E2H`; the simulator displays `E2H`, decimal `226`, and the carry or overflow indicator.

## Project Structure

```text
sap1-simulator/
	README.md
	sap1_react/
		index.html
		package.json
		package-lock.json
		vite.config.js
		LICENSE
		src/
			main.jsx
			App.jsx
			App.css
			index.css
			core/cpu.js
			core/__tests__/cpu.test.js
			hooks/useSap1.js
			components/
				RegisterPanel.jsx
				IRPanel.jsx
				RamViewer.jsx
				ControllerPanel.jsx
				AdderSubtractor.jsx
				WBus.jsx
				OutputLEDs.jsx
				ControlsPanel.jsx
				ProgramLoader.jsx
				ResultCheck.jsx
				ErrorBoundary.jsx
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
2. Enter `25`, `05`, and `23`, leave the addresses at `9H`, `AH`, and `BH`, select `ADD` then `SUB`, and load the program.
3. Use Step T-state through the fetch and LDA cycle, showing `IR -> W-BUS -> MAR` with `Ei` and `Lm` active.
4. Use Step instruction for ADD, SUB, and OUT, pointing to the active controller signals and W-Bus transfers.
5. Run at a visible clock speed until HLT and show `07H`, `0000 0111`, PASS, and the stopped status.
6. Reset, demonstrate ADD-ADD and SUB-SUB through the two operation dropdowns, and show the updated LED values.
7. Demonstrate an overflow case such as `FFH + 01H + 00H = 00H` and show the wrapped eight-bit result.

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

MIT. See [`sap1_react/LICENSE`](sap1_react/LICENSE).
