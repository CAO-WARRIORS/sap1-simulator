export const PRESETS = {
  "25H + 05H - 23H = 07H": `0: LDA 9\n1: ADD A\n2: SUB B\n3: OUT\n4: HLT\n9: 25H\nA: 05H\nB: 23H`,
  "Add two numbers": `0: LDA 9\n1: ADD A\n2: OUT\n3: HLT\n9: 12H\nA: 08H`,
  "Subtract two numbers": `0: LDA 9\n1: SUB A\n2: OUT\n3: HLT\n9: 20H\nA: 07H`,
};
