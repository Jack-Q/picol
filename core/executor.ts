import { ErrorSeverity } from './error';
import { Quadruple, QuadrupleArgQuadRef, QuadrupleOperator } from './quadruple';

interface IConsoleMessage {
  message: string;
  severity: ErrorSeverity;
}

export class Executor {
  public pc: number;
  public stack: number[];
  public heap: number[];
  public temp: number[];
  public program: Quadruple[];
  public console: IConsoleMessage[];

  constructor(program?: Quadruple[]) {
    this.console = [];
    if (program) {
      this.program = program;
    }
    this.reset();
  }

  public step() {
    console.log(this.pc);
    // read quadruple
    const quad = this.program[this.pc];
    if (!quad) {
      return this.pushError('program counter out of range');
    }
    this.pc++;

    switch (quad.operator) {
      // Jump
      case QuadrupleOperator.J_JMP: // jump unconditionally
        this.pc = (quad.result as QuadrupleArgQuadRef).quadIndex;
        this.pushMsg('jump to ' + this.pc);
        break;
      case QuadrupleOperator.J_EQ:  // jump if equal
      case QuadrupleOperator.J_NE:  // jump if not equal
      case QuadrupleOperator.J_GT:  // jump if greater than
      case QuadrupleOperator.J_GTE: // jump if greater than or equal
      case QuadrupleOperator.J_LT:  // jump if less than
      case QuadrupleOperator.J_LTE: // jump if less than or equal
      case QuadrupleOperator.J_EZ:  // jump if equal to zero
      case QuadrupleOperator.J_NEZ: // jump if not equal to zero

      // integer arithmetic
      case QuadrupleOperator.I_ADD:
      case QuadrupleOperator.I_SUB:
      case QuadrupleOperator.I_MUL:
      case QuadrupleOperator.I_DIV:

      // float point (real) arithmetic
      case QuadrupleOperator.R_ADD:
      case QuadrupleOperator.R_SUB:
      case QuadrupleOperator.R_MUL:
      case QuadrupleOperator.R_DIV:

      // primitive variable assignment
      case QuadrupleOperator.V_ASS:

      // array assignment
      case QuadrupleOperator.A_ASS: // array assignment
      case QuadrupleOperator.A_RET: // array retrieval

      // procedure call
      case QuadrupleOperator.F_PARA: // prepare argument for procedural call
      case QuadrupleOperator.F_FUNC: // call procedural (control of flow)
      case QuadrupleOperator.F_REV:  // prepare return value
      case QuadrupleOperator.F_RET:  // function return (control of flow)
      case QuadrupleOperator.F_VAL:  // bind return value of function to temp

      // heap memory management
      case QuadrupleOperator.M_REQ:  // request allocation of heap memory
      case QuadrupleOperator.M_FREE: // free heap memory
    }

  }

  public load(program: Quadruple[]) {
    this.program = program;
    this.reset();
  }

  public reset() {
    this.pc = 0;
    this.heap = [];
    this.stack = [];
    this.temp = [];
  }

  private pushError(message: string, severity: ErrorSeverity = ErrorSeverity.ERROR) {
    this.console.push({ message, severity });
  }
  private pushMsg(message: string, severity: ErrorSeverity = ErrorSeverity.INFO) {
    this.console.push({ message, severity });
  }
}
