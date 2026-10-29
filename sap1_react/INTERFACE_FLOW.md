# SAP-1 Studio Interface Flow

This document describes how the SAP-1 Studio interface is organized, how a user operates the simulator, and how data moves from the controls into the CPU and back into the visual hardware panels.

## 1. Application Purpose

SAP-1 Studio is a browser-based visual simulator for the Simple-As-Possible 1 computer. It presents the machine as a sequence of visible hardware blocks instead of hiding execution inside a terminal or console.

The interface lets the user:

- Enter three data values in hexadecimal.
- Choose the three memory addresses used by the sample program.
- Load a five-instruction SAP-1 program.
- Execute one complete instruction at a time.
- Execute one T-state at a time.
- Run continuously until HLT.
- Reset the registers and output.
- Inspect RAM, registers, the controller, arithmetic unit, W-Bus, and output LEDs.

## 2. Page-Level Layout

The page is divided into three visual areas:

```text
Header
  - SAP-1 Studio title
  - Short description
  - Current machine status

Main workspace
  Sidebar
    - Load program panel
    - Expected/actual result panel
    - Controls panel

  Machine view
    - W-Bus activity
    - Ordered SAP-1 hardware chain
    - Error message, when necessary
```

The sidebar contains user actions. The machine view contains the visible state of the simulated computer.

## 3. Hardware Display Order

The hardware chain follows the requested SAP-1 order:

1. **PC**: Four-bit Program Counter. Holds the address of the next instruction.
2. **MAR**: Four-bit Memory Address Register. Holds the address currently selected in RAM.
3. **RAM**: Sixteen addresses containing eight-bit values. The MAR address is highlighted.
4. **IR**: Eight-bit Instruction Register. Shows the opcode and operand nibbles separately.
5. **Controller-Sequencer**: Shows the current T-state, decoded instruction, and active control-signal LEDs.
6. **Accumulator A**: Stores the primary arithmetic value.
7. **Adder/Subtractor**: Displays the current arithmetic result and ADD/SUB mode.
8. **B Register**: Holds the memory operand for ADD and SUB operations.
9. **Output Register**: Receives the accumulator value during OUT.
10. **Binary Output LEDs**: Shows output bit 7 through bit 0 as illuminated or unilluminated LEDs.

The W-Bus activity panel is displayed above the chain because it represents the shared transfer path between these blocks.

## 4. Program Loading Flow

### 4.1 Initial State

When the page opens:

- The three data fields are empty.
- The default data addresses are `9H`, `AH`, and `BH`.
- The machine registers contain zero.
- The status is `Ready`.
- The output LEDs are off.

### 4.2 Load Sample Program

The **Load sample program** button restores the sample address layout and clears the three data fields so the user can enter new values.

The sample instruction layout is:

| Address | Instruction          | Machine code |
| ------- | -------------------- | ------------ |
| `0H`    | `LDA data-A-address` | `0000 xxxx`  |
| `1H`    | `ADD data-B-address` | `0001 xxxx`  |
| `2H`    | `SUB data-C-address` | `0010 xxxx`  |
| `3H`    | `OUT`                | `1110 1111`  |
| `4H`    | `HLT`                | `1111 1111`  |

The data values are stored at the three addresses entered by the user.

### 4.3 Input Validation

When **Load program** is submitted, the interface validates:

- Every data field must contain a hexadecimal value from `00H` through `FFH`.
- Every address must contain a hexadecimal value from `0H` through `FH`.
- The three data addresses must be different.
- Addresses `0H` through `4H` are reserved for the five sample instructions.

Invalid input prevents loading and displays a clear error below the form.

### 4.4 Successful Load

A successful load performs this flow:

```text
User submits values
  -> ProgramLoader validates fields
  -> ProgramLoader creates a 16-byte memory image
  -> useSap1 dispatches LOAD
  -> SAP1.loadProgram(memory) resets execution state
  -> React receives the new CPU snapshot
  -> RAM and all hardware panels re-render
```

The expected result is calculated as:

```text
(data A + data B - data C) modulo 256
```

The result panel remains `PENDING` until the machine reaches HLT.

## 5. Control Flow

### Load Program

The **Load Program** control focuses the first data input in the loader. The actual memory load is performed by the **Load program** form button after validation.

### Step

The **Step** button executes one complete instruction. Internally, the CPU advances through all required T-states until the next fetch cycle begins.

Examples:

- LDA takes T1 through T6.
- ADD takes T1 through T6.
- SUB takes T1 through T6.
- OUT takes T1 through T6.
- HLT stops during the HLT control state.

### Step T-state

The **Step T-state** button advances exactly one micro-operation. This is useful for observing:

- PC loading MAR.
- PC incrementing.
- RAM loading IR.
- IR loading MAR.
- RAM loading A or B.
- The adder/subtractor loading A.
- A loading the Output Register.

Each micro-step updates the W-Bus source, destination, value, and active control signals.

### Run

The **Run** button starts an interval timer. Each timer tick executes one instruction. Run continues until:

- The HLT instruction is reached.
- An illegal opcode or CPU error occurs.
- The 1000-instruction safety limit is reached.

While running, the status badge displays `RUNNING`. Once HLT is reached, it displays `HALTED`.

### Reset

The **Reset** button clears:

- PC
- MAR
- IR
- Accumulator A
- B Register
- Output Register
- W-Bus activity
- Active control signals
- Halted and error state

The loaded program remains available in the loader memory state, but execution begins again from address `0H`.

### Clock Speed

The clock-speed slider controls the delay between automatic instruction steps during Run. It changes the timer interval without changing CPU behavior.

## 6. CPU-to-Interface Data Flow

The React hook `useSap1` owns one `SAP1` instance and exposes its snapshot to the interface.

```text
SAP1 instance
  -> snapshot()
  -> useSap1 reducer
  -> machine state
  -> App.jsx
  -> hardware components
```

The CPU snapshot contains:

- Register values: `pc`, `mar`, `ir`, `a`, `b`, `output`
- `memory`
- Current `tState`
- `halted`
- `error`
- `busValue`
- `busSource`
- `busDestination`
- `activeSignals`

The hook also derives UI-only information such as changed register names, status text, expected result, and instruction count.

The UI does not duplicate arithmetic or instruction execution. It only formats and displays the CPU snapshot.

## 7. T-State Display Flow

### Fetch Cycle

| T-state | CPU operation    | Visible result                                     |
| ------- | ---------------- | -------------------------------------------------- |
| T1      | `MAR <- PC`      | PC is sent to MAR on the W-Bus; MAR is highlighted |
| T2      | `PC <- PC + 1`   | PC increments and wraps from `FH` to `0H`          |
| T3      | `IR <- RAM[MAR]` | RAM value is loaded into IR                        |

### LDA

| T-state | CPU operation       | Visible result                  |
| ------- | ------------------- | ------------------------------- |
| T4      | `MAR <- IR operand` | Operand address is shown in MAR |
| T5      | `A <- RAM[MAR]`     | Memory value appears in A       |
| T6      | No operation        | Instruction cycle returns to T1 |

### ADD

| T-state | CPU operation       | Visible result                  |
| ------- | ------------------- | ------------------------------- |
| T4      | `MAR <- IR operand` | Operand address is shown in MAR |
| T5      | `B <- RAM[MAR]`     | Memory value appears in B       |
| T6      | `A <- A + B`        | Adder result appears in A       |

### SUB

| T-state | CPU operation       | Visible result                                        |
| ------- | ------------------- | ----------------------------------------------------- |
| T4      | `MAR <- IR operand` | Operand address is shown in MAR                       |
| T5      | `B <- RAM[MAR]`     | Memory value appears in B                             |
| T6      | `A <- A - B`        | Subtractor result appears in A, wrapped to eight bits |

### OUT

| T-state | CPU operation | Visible result                     |
| ------- | ------------- | ---------------------------------- |
| T4      | `Output <- A` | Output Register and LEDs receive A |
| T5      | No operation  | Output remains stable              |
| T6      | No operation  | Instruction cycle returns to T1    |

### HLT

When HLT is decoded, the CPU sets `halted = true`. The controller activates the `HLT` signal, the Run timer stops, and the status badge changes to `HALTED`.

## 8. Visual Feedback Rules

### Registers

A register receives the `register--changed` highlight when its value changes during the most recent action. Register values are shown in both binary and hexadecimal form.

### RAM

The row at the current MAR address receives the access highlight. The row at the PC address displays a PC pointer.

### IR

The IR panel separates the eight-bit instruction into:

- Four-bit opcode nibble.
- Four-bit operand nibble.
- Decoded mnemonic such as `LDA 9H` or `ADD AH`.

### Controller Signals

Active signals receive an orange LED and highlighted background. The supported signals are:

```text
Ep, Lm, CE, Li, Ei, La, Ea, Eu, Su, Lb, Lo, Cp, HLT
```

### W-Bus

When data is moving, the W-Bus line is highlighted and displays a message such as:

```text
PC -> W-BUS -> MAR
RAM -> W-BUS -> A
IR -> W-BUS -> MAR
Adder/Subtractor -> W-BUS -> A
```

The bus value is shown in binary and hexadecimal form.

### Output LEDs

Each LED represents one output bit:

- LED 7 is the most significant bit.
- LED 0 is the least significant bit.
- A value of `1` illuminates the LED.
- A value of `0` leaves the LED unlit.

For the sample result `07H`, bits 2, 1, and 0 are illuminated.

## 9. Complete Example Flow

Using:

```text
A data = 25H
B data = 05H
C data = 23H
A address = 9H
B address = AH
C address = BH
```

The user flow is:

1. Click **Load sample program**.
2. Enter `25` in A data.
3. Enter `05` in B data.
4. Enter `23` in C data.
5. Leave addresses at `9`, `A`, and `B`.
6. Click **Load program**.
7. Confirm RAM contains the five instructions and three data values.
8. Click **Step T-state** to inspect individual transfers, or click **Run**.
9. The CPU executes `LDA 9H`, producing `25H` in A.
10. The CPU executes `ADD AH`, producing `2AH` in A.
11. The CPU executes `SUB BH`, producing `07H` in A.
12. The CPU executes `OUT`, copying `07H` to the Output Register.
13. The CPU executes `HLT`.
14. The status changes to `HALTED`.
15. The LEDs show `00000111`.
16. The result panel shows `Expected 07H`, `Actual 07H`, and `PASS`.

## 10. Main Source Files

```text
src/
  App.jsx                  Main page composition and hardware order
  App.css                  Layout, color, typography, and hardware styles
  core/cpu.js              Pure SAP-1 CPU model
  hooks/useSap1.js         React state bridge around the CPU model
  components/
    RegisterPanel.jsx      Reusable register display
    IRPanel.jsx            Instruction Register display
    RamViewer.jsx          16 x 8 RAM table
    ControllerPanel.jsx    T-state and control-signal display
    AdderSubtractor.jsx    Arithmetic-unit display
    WBus.jsx               Bus activity display
    OutputLEDs.jsx         Eight-bit output indicator
    ControlsPanel.jsx      Step, run, reset, and speed controls
    ProgramLoader.jsx      Program and data input form
    ResultCheck.jsx        Expected versus actual result
    ErrorBoundary.jsx      Render error fallback
```

## 11. Verification Commands

Run these commands from the `sap1_react` directory:

```powershell
npm install
npm test
npm run build
npm run dev
```

The core and interface behavior can be checked with the sample calculation:

```text
25H + 05H - 23H = 07H
```
