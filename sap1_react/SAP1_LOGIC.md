# SAP-1 Studio Logic

This document explains how the SAP-1 Studio website works and how the simulated SAP-1 computer executes a program.

## 1. What The Website Does

SAP-1 Studio is a visual CPU simulator. Instead of showing only the final answer, it displays the internal activity of the computer while a program runs:

- Program Counter (PC)
- Memory Address Register (MAR)
- 8-bit Instruction Register (IR)
- 16 x 8-bit RAM
- Accumulator (A)
- B Register
- Output Register
- Adder/Subtractor
- W-Bus transfers
- Controller signals
- Eight output LEDs

The page is divided into two main areas:

```text
Header
  -> title and current status

Sidebar
  -> program loader
  -> expected/actual result
  -> Step, Micro-step, Run, Reset, and clock speed

Machine view
  -> W-Bus
  -> registers and RAM
  -> instruction register
  -> controller signals
  -> arithmetic unit
  -> output register and LEDs
```

The React interface does not perform CPU arithmetic itself. It sends actions to the simulator and displays the state returned by the CPU.

## 2. Main Data Flow

The active execution path is:

```text
User action
  -> React component
  -> useSap1 reducer
  -> SAP1 CPU instance
  -> CPU snapshot
  -> React state
  -> hardware components re-render
```

Important files:

| File                      | Responsibility                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `src/App.jsx`             | Arranges the page and passes CPU values to visual components                       |
| `src/hooks/useSap1.js`    | Owns the CPU instance and translates UI actions into state changes                 |
| `src/core/cpu.js`         | Implements registers, memory, T-states, instructions, bus activity, and arithmetic |
| `src/engine/assembler.js` | Converts assembly or formula input into a 16-byte memory image                     |
| `src/components/*.jsx`    | Displays individual CPU parts and controls                                         |
| `src/App.css`             | Provides the visual layout and responsive behavior                                 |

`useSap1` stores one `SAP1` object. After every CPU operation it calls `snapshot()`, which returns a copy of the machine state for React to render.

## 3. SAP-1 Machine State

The simulator uses a small 4-bit-address, 8-bit-data computer.

### Registers

| Register |   Size | Purpose                                              |
| -------- | -----: | ---------------------------------------------------- |
| PC       | 4 bits | Address of the next instruction                      |
| MAR      | 4 bits | Address currently selected in RAM                    |
| IR       | 8 bits | Current instruction: 4-bit opcode plus 4-bit operand |
| A        | 8 bits | Main accumulator and arithmetic result               |
| B        | 8 bits | Temporary arithmetic operand                         |
| Output   | 8 bits | Value sent to the output display                     |

### Memory

RAM contains 16 locations, addressed from `0H` through `FH`. Every location stores one byte from `00H` through `FFH`.

The program normally occupies the first memory locations. Data values can be stored in other locations and referenced by an instruction operand.

### Instruction Format

Each instruction is one byte:

```text
[ opcode: 4 bits ][ operand/address: 4 bits ]
```

For example:

```text
0000 1001 = 09H = LDA 9H
```

The high nibble selects the operation. The low nibble selects a RAM address for instructions that need one.

## 4. Instruction Set

| Instruction | Opcode | Operation                           |
| ----------- | ------ | ----------------------------------- |
| `LDA addr`  | `0000` | `A <- RAM[addr]`                    |
| `ADD addr`  | `0001` | `B <- RAM[addr]`, then `A <- A + B` |
| `SUB addr`  | `0010` | `B <- RAM[addr]`, then `A <- A - B` |
| `OUT`       | `1110` | `Output <- A`                       |
| `HLT`       | `1111` | Stop execution                      |

`OUT` and `HLT` do not need an address. Their unused operand is encoded as `FH`, so their machine codes are usually `EFH` and `FFH`.

Unknown opcodes put the CPU into an error state and display an illegal-opcode message.

## 5. Loading A Program

The program loader supports formula input and custom assembly/machine-code input.

### Formula Loading

The formula loader accepts three 8-bit hexadecimal values and two operations. It creates a five-instruction program similar to this:

```text
Address  Instruction
0H       LDA 9H
1H       ADD AH
2H       SUB BH
3H       OUT
4H       HLT
9H       first data value
AH       second data value
BH       third data value
```

The selected operations determine whether the generated program performs combinations such as:

```text
A + B - C
A + B + C
A - B - C
```

The expected result is calculated separately for the result panel, then compared with the value produced in the Output Register.

### Custom Program Loading

The assembler accepts either mnemonic lines or eight-bit binary lines.

Example assembly:

```text
LDA 9H
ADD AH
SUB BH
OUT
HLT
```

Example machine code:

```text
00001001
00011010
00101011
11101111
11111111
```

The assembler validates the mnemonic, operand format, number of lines, and binary values. A valid program becomes a 16-byte memory array and is passed to `SAP1.loadProgram()`.

Loading a program clears the CPU execution state, copies the program into RAM, resets the PC to `0H`, and marks the program as loaded.

## 6. The Fetch Cycle

Every instruction begins with the same three fetch T-states:

### T1: Load MAR

```text
MAR <- PC
```

The current PC address is placed on the W-Bus and loaded into MAR.

Active signals:

```text
Ep, Lm
```

### T2: Increment PC

```text
PC <- PC + 1
```

The PC advances to the next memory location. Because PC is 4 bits, it wraps from `FH` back to `0H`.

Active signal:

```text
Cp
```

### T3: Load IR

```text
IR <- RAM[MAR]
```

The byte at the MAR address is read from RAM and loaded into the Instruction Register.

Active signals:

```text
CE, Li
```

At the end of T3, the CPU decodes the opcode in the IR and performs the instruction-specific part of the cycle.

## 7. Instruction T-States

### LDA

```text
T4: MAR <- IR operand
T5: A <- RAM[MAR]
T6: finish instruction and return to T1
```

Signals:

```text
T4: Ei, Lm
T5: CE, La
```

### ADD

```text
T4: MAR <- IR operand
T5: B <- RAM[MAR]
T6: A <- A + B
```

Signals:

```text
T4: Ei, Lm
T5: CE, Lb
T6: Eu, La
```

### SUB

```text
T4: MAR <- IR operand
T5: B <- RAM[MAR]
T6: A <- A - B
```

Signals:

```text
T4: Ei, Lm
T5: CE, Lb
T6: Eu, La, Su
```

Subtraction is wrapped to eight bits. For example:

```text
05H - 23H = E2H
```

The simulator also records the carry/overflow state for the arithmetic display.

### OUT

```text
T4: Output <- A
T5: no data transfer
T6: finish instruction and return to T1
```

Signals:

```text
T4: Ea, Lo
```

The Output Register receives the accumulator value, and the eight LEDs update to show its binary bits.

### HLT

When the CPU decodes `HLT`, it sets `halted` to true and activates the `HLT` signal. The run timer stops and the status changes to `Halted`.

## 8. W-Bus And Control Signals

The W-Bus is the shared path used to move values between CPU parts. The interface displays its source, destination, and value.

Examples:

```text
PC -> W-BUS -> MAR
RAM -> W-BUS -> IR
IR -> W-BUS -> MAR
RAM -> W-BUS -> A
RAM -> W-BUS -> B
Adder/Subtractor -> W-BUS -> A
A -> W-BUS -> Output
```

The controller displays the active signals for the current T-state:

```text
Ep, Lm, CE, Li, Ei, La, Ea, Eu, Su, Lb, Lo, Cp, HLT
```

The signals are visual feedback for the transfer being performed. They do not represent separate user actions.

## 9. Website Controls

### Step

`Step` completes one full fetch-decode-execute instruction. Internally it repeatedly advances the CPU until the next instruction begins.

For example, one `Step` for `ADD` performs T1 through T6.

### Step T-state

`Step T-state` advances exactly one CPU micro-operation. This makes it possible to observe each transfer individually:

1. PC loads MAR.
2. PC increments.
3. RAM loads IR.
4. The operand loads MAR.
5. RAM loads A or B.
6. The arithmetic unit loads A, or the instruction completes.

The current T-state, W-Bus, active signals, changed registers, and RAM highlights update after every micro-step.

### Run

`Run` starts a timer. Each timer tick advances exactly one T-state, using the selected clock-speed interval. This keeps the bus and control-signal activity visible while the program runs.

Run stops when:

- The CPU reaches `HLT`.
- An illegal opcode or other CPU error occurs.
- The 6000-T-state safety limit is reached, which protects the browser from an infinite loop.

### Reset

`Reset` clears the registers, output, bus activity, active signals, halt state, and execution counters. It reloads the currently loaded memory image, so the program remains available and execution starts again at `0H`.

### Clock Speed

The speed slider changes the delay between Run timer ticks. It changes how quickly the animation proceeds, not the CPU rules or arithmetic.

## 10. Visible Feedback

The UI highlights the most recent changes so the execution can be followed visually:

- Changed registers receive a highlighted background.
- The RAM row at MAR shows the current memory access.
- The RAM row at PC shows the next instruction location.
- The IR separates opcode and operand nibbles and shows the decoded mnemonic.
- Active controller signals are highlighted.
- The W-Bus shows the current transfer and value.
- The arithmetic panel shows ADD or SUB activity and the current result.
- The output LEDs represent bits 7 through 0 of the Output Register.
- The result panel compares the expected formula result with the actual output.

## 11. Complete Example

For the values:

```text
A = 25H
B = 05H
C = 23H
Operation = A + B - C
```

The generated program is:

```text
0H: LDA 9H
1H: ADD AH
2H: SUB BH
3H: OUT
4H: HLT
```

Execution is:

```text
A <- RAM[9H] = 25H
A <- A + RAM[AH] = 25H + 05H = 2AH
A <- A - RAM[BH] = 2AH - 23H = 07H
Output <- A = 07H
CPU halts
```

The result panel displays `07H`, and the LEDs for bits 2, 1, and 0 are on:

```text
07H = 0000 0111
```

## 12. Error Handling

The application reports errors instead of silently continuing when:

- A formula value is outside the 8-bit range.
- A program contains more than 16 lines.
- An assembly mnemonic is invalid.
- An instruction operand is not one hexadecimal digit.
- A machine-code line is invalid.
- The CPU encounters an illegal opcode.
- Run reaches the 6000-T-state safety limit.

The error is stored in simulator state and displayed by the React interface. The Error Boundary also protects the page from an unexpected rendering error.
