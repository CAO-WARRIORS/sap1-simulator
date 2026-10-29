# GitHub Copilot Instructions --- SAP-1 Simulator

## 1. Project Purpose

Build a browser-based SAP-1 (Simple-As-Possible 1) Computer Architecture
Simulator for the Computer Architecture and Organization project.

The application must visually demonstrate SAP-1 registers, memory, the
W-Bus, control/execution behavior, and binary output. This must be a
graphical web application with visible components and clickable
controls---not a terminal- or console-based simulator.

## 2. Technology and Existing Project

-   Use **React with Vite and JavaScript/JSX**.
-   Do not convert the project to TypeScript or TSX unless explicitly
    requested.
-   Inspect the existing files and `package.json` before making changes.
-   Reuse existing dependencies and project conventions where practical.
-   Keep simulator logic separate from presentation components.
-   Do not introduce new dependencies without a clear need.
-   Keep the application responsive and usable in a desktop browser.

## 3. Required SAP-1 Architecture

Implement and visually display these components:

-   **RAM:** 16 memory locations, each 8 bits wide, addressed from `0H`
    through `FH`.
-   **Program Counter (PC):** 4-bit register; increments during the
    fetch cycle.
-   **Memory Address Register (MAR).**
-   **Instruction Register (IR):** 8-bit instruction, with the upper
    nibble representing the opcode and the lower nibble representing the
    operand.
-   **Accumulator (A Register):** 8-bit register.
-   **B-Register:** 8-bit register.
-   **Adder/Subtractor:** addition and subtraction, with subtraction
    implemented using two's-complement arithmetic.
-   **Output Register:** stores the value displayed by the output
    component.
-   **Controller/Sequencer:** decodes instructions and controls the
    appropriate execution steps.

Show register values in binary and/or hexadecimal. Keep displayed values
synchronized with the actual simulator state.

## 4. Supported Instructions

Use the opcodes specified by the project brief:

  -----------------------------------------------------------------------
  Instruction             4-bit opcode            Required behavior
  ----------------------- ----------------------- -----------------------
  `LDA address`           `0000`                  Load the accumulator
                                                  from the specified RAM
                                                  address.

  `ADD address`           `0001`                  Add the value at the
                                                  specified RAM address
                                                  to the accumulator.

  `SUB address`           `0010`                  Subtract the value at
                                                  the specified RAM
                                                  address from the
                                                  accumulator using
                                                  two's-complement
                                                  arithmetic.

  `OUT`                   `1110`                  Copy the accumulator
                                                  value to the Output
                                                  Register.

  `HLT`                   `1111`                  Stop execution.
  -----------------------------------------------------------------------

Instructions are 8 bits wide: the upper four bits are the opcode and the
lower four bits are the operand/address. Follow the project brief's
encoding, including its sample `OUT` and `HLT` machine codes.

Use consistent 8-bit behavior for registers and arithmetic. Avoid
silently displaying values outside the 8-bit range. Document any
overflow or underflow behavior chosen by the implementation.

## 5. Required User Interface

Create a clear graphical representation inspired by a simplified SAP-1
block diagram. Include:

### Register panels

-   Separate visible panels for PC, MAR, IR, Accumulator, B-Register,
    and Output Register.
-   Display each register's current value in binary and/or hexadecimal.
-   Update values in real time after every simulated step.

### RAM viewer

-   Show all 16 memory addresses and their 8-bit contents in a table or
    grid.
-   Make it possible to distinguish instruction memory from data memory
    when useful.
-   Highlight the currently accessed memory address.
-   Show addresses in hexadecimal (`0H`--`FH`) consistently.

### W-Bus visualization

-   Visually indicate data movement along the W-Bus using a highlighted
    line, arrow, animation, or color change.
-   Tie visual bus activity to actual simulator actions. Do not show
    decorative activity that does not correspond to the simulation
    state.

### Binary output

-   Display eight graphical LEDs representing the Output Register's
    eight bits.
-   Light each LED according to the corresponding bit.
-   Also show the output value in binary and hexadecimal.

### Controls

Provide visible, clickable controls for: - **Load Program:** accept a
program and data values entered by the user. - **Execute One Step /
Step:** advance the simulation by one defined step. - **Run
Automatically / Run:** execute until `HLT` or a safe execution limit is
reached. - **Reset:** restore registers and execution state to their
initial values and reinitialize the simulator. - An optional clock-speed
slider may be added if it does not interfere with correctness.

Show helpful validation messages for invalid programs, invalid
addresses, or missing values. Disable or appropriately handle controls
when the simulator is halted or running.

## 6. User-Entered Formulas and Sample Program

The application must support demonstration of **three different
formulas** using values entered by the user. Do not hard-code the sample
formula's data values as the only possible inputs.

Use the project brief's sample program as a reference:

  Address   Instruction/data   Machine code/value
  --------- ------------------ --------------------------
  `0H`      `LDA 9H`           `0000 1001`
  `1H`      `ADD AH`           `0001 1010`
  `2H`      `SUB BH`           `0010 1011`
  `3H`      `OUT`              `1110 1111`
  `4H`      `HLT`              `1111 1111`
  `9H`      Data A             User-entered 8-bit value
  `AH`      Data B             User-entered 8-bit value
  `BH`      Data C             User-entered 8-bit value

The reference formula is `A + B - C`. The brief's example values are
`25H`, `05H`, and `23H`, with expected output `07H` (`0000 0111`). Treat
those values as an example, not fixed program data.

Allow the user to enter the values through the interface, load them into
RAM, and run the actual simulated instructions to produce the output.
The result must come from the simulator---not from a separate formula
calculation that bypasses SAP-1 execution.

The recorded demonstration must show three different formulas, such as
`A + B - C`, using values entered by the user. Plan the interface so the
user can change the input values and run each case.

## 7. Simulation Correctness

-   Implement a real, deterministic simulator state; do not fake
    register updates or output values.
-   Define a clear fetch/decode/execute sequence consistent with the
    SAP-1 teaching architecture and the project brief.
-   Ensure PC, MAR, IR, A, B, RAM, and Output Register changes reflect
    the operation being executed.
-   Make **Step** and **Run** use the same simulation logic so they
    produce the same final state for the same program.
-   Stop on `HLT`.
-   Prevent infinite loops or runaway execution with a reasonable
    maximum-step safeguard.
-   Reset all relevant state, including halted/running status, current
    memory highlight, bus indication, and execution history.
-   Handle malformed instructions and invalid program input gracefully.
-   Do not claim that the simulator models physical timing or hardware
    beyond what is actually implemented.
-   If the project brief leaves a detail unspecified, choose a simple,
    consistent behavior and document it rather than inventing extra
    architectural requirements.

## 8. Code Quality and React Practices

-   Use functional React components and hooks in the style already used
    by the project.
-   Keep the CPU/simulation engine testable and independent from UI
    rendering where practical.
-   Use clear names for registers, opcodes, memory addresses, and
    execution actions.
-   Avoid duplicating instruction execution logic across components.
-   Avoid unnecessary global state and avoid mutating React state
    directly.
-   Keep components reasonably small and focused.
-   Provide accessible labels for inputs and buttons.
-   Use readable contrast and clear visual states for selected
    addresses, active bus transfers, running, and halted status.
-   Do not replace functioning project code wholesale when a focused
    change is sufficient.

## 9. Testing and Verification

After significant changes:

-   Run the available lint/test scripts if configured.
-   Run `npm run build`.
-   Fix errors caused by the changes before reporting completion.
-   Test each supported instruction.
-   Test Step and Run against the same program and compare the final
    state.
-   Test Reset after a partial run and after `HLT`.
-   Verify all 16 RAM addresses are visible and address selection works.
-   Verify the eight LEDs match the Output Register.
-   Verify user-entered values are loaded into RAM and are not replaced
    by hard-coded sample values.
-   Verify the sample values `25H + 05H - 23H` produce `07H`.
-   Verify at least three different user-entered formula cases for the
    demonstration.
-   If a test cannot be run, state that clearly; do not claim it passed.

## 10. Documentation and Deliverables

Maintain a `README.md` that includes:

-   Project overview and main features.
-   Technologies used and a concise justification for using React/Vite.
-   Prerequisites.
-   Installation instructions.
-   How to start the development server.
-   How to build the production version.
-   How to use the program loader, Step, Run, Reset, and output display.
-   Any implemented assumptions or limitations.

The project deliverables are a GitHub repository, a README, and a
recorded demonstration showing three different formulas with
user-entered values and visible results.

## 11. Copilot Workflow

Before changing code:

1.  Inspect the relevant source files and current project structure.
2.  Explain the planned change briefly when the task is substantial.
3.  Identify potential effects on existing simulator behavior.
4.  Implement the smallest coherent change that meets the request.

After changing code:

1.  Summarize the files changed and behavior implemented.
2.  Report the build/tests actually run and their results.
3.  Call out any remaining issues or unverified behavior.

Do not silently remove requirements, hard-code outputs, bypass the
simulator, or make unrelated changes. Prioritize correctness and visual
clarity over elaborate animations, consistent with the project brief.
