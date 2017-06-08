import { ErrorSeverity } from './error';
import { Quadruple, QuadrupleArg, QuadrupleArgArrayAddr, QuadrupleArgQuadRef, QuadrupleArgTableRef, QuadrupleArgType, QuadrupleArgValue, QuadrupleArgVarTemp, QuadrupleOperator } from './quadruple';
import { getPrimitiveSize } from './symbol-entry';
import { PrimitiveType } from './token';

interface IConsoleMessage {
  message: string;
  severity: ErrorSeverity;
}

interface IExecutionVal {
  value: any;
  span: number;
}

const HEAP_BASE = 10000;

export class Executor {
  public pc: number;
  public frameBase: number;
  public stack: number[];
  public heapTop: number;
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
    // read quadruple
    const quad = this.program[this.pc - 1];
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
        {
          const val1 = this.getValue(quad.argument1);
          const val2 = this.getValue(quad.argument2);
          if (this.compareByOperator(quad.operator, val1.value, val2.value)) {
            this.pc = (quad.result as QuadrupleArgQuadRef).quadIndex;
            this.pushMsg(`jump conditionally to ${this.pc}: ${val1.value} ${quad.operatorName} ${val2.value}`);
          } else {
            this.pushMsg(`unsatisfied jump condition: ${val1.value} ${quad.operatorName} ${val2.value}`);
          }
        }
        break;
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
        {
          const val1 = this.getValue(quad.argument1);
          const val2 = this.getValue(quad.argument2);
          const result = this.calcByOperator(quad.operator, val1.value, val2.value);
          const target = quad.result as QuadrupleArgVarTemp;
          console.log(target, result);
          this.temp[target.tempIndex] = result.value;
        }
        break;

      // primitive variable assignment
      case QuadrupleOperator.V_ASS:
        break;
      // array assignment
      case QuadrupleOperator.A_ASS: // array assignment
        {
          const val = quad.argument1 as QuadrupleArgValue;
          if (quad.result.type === QuadrupleArgType.ARRAY_ADDR) {
            const dst = quad.result as QuadrupleArgArrayAddr;
            const base = dst.base.type === QuadrupleArgType.TABLE_REF
              ? (dst.base as QuadrupleArgTableRef).index : this.getValue(dst.base).value;
            const offset = this.getValue(dst.offset).value;
            this.stackFill(this.frameBase + base + offset, this.getValue(val));
          } else {
            const dst = quad.result as QuadrupleArgTableRef;
            this.stackFill(this.frameBase + dst.index, this.getValue(val));
          }
        }
        break;
      case QuadrupleOperator.A_RET: // array retrieval
        {
          const data = this.getValue(quad.argument1);
          const target = quad.result as QuadrupleArgVarTemp;
          this.temp[target.tempIndex] = data.value;
        }
        break;

      // reference assignment
      case QuadrupleOperator.R_ASS: // assign array reference to target
        {
          // array reference copy
          const val = quad.argument1 as QuadrupleArgTableRef;

          const dst = quad.result as QuadrupleArgTableRef;
          this.stackFill(this.frameBase + dst.index, {
            value: val.index, span: getPrimitiveSize('ref') });
        }
        break;

      // procedure call
      case QuadrupleOperator.F_PARA: // prepare argument for procedural call
      case QuadrupleOperator.F_FUNC: // call procedural (control of flow)
      case QuadrupleOperator.F_REV:  // prepare return value
      case QuadrupleOperator.F_RET:  // function return (control of flow)
      case QuadrupleOperator.F_VAL:  // bind return value of function to temp
        break;
      // heap memory management
      case QuadrupleOperator.M_REQ:  // request allocation of heap memory
        {
          const size = this.getValue(quad.argument1).value;
          const target = quad.result as QuadrupleArgVarTemp;
          const address = this.allocateHeap(size);
          this.temp[target.tempIndex] = address;
        }
        break;
      case QuadrupleOperator.M_FREE: // free heap memory
    }

  }

  public load(program: Quadruple[]) {
    this.program = program;
    this.reset();
  }

  public reset() {
    this.pc = 1;
    this.frameBase = 0;
    this.heapTop = HEAP_BASE;
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
  private stackFill(addr: number, val: IExecutionVal) {
    if (addr > HEAP_BASE) {
      // assign to heap
      this.heap[addr - HEAP_BASE] = val.value;
      for (let i = 1; i < val.span; i++) {
        this.heap[addr + i - HEAP_BASE] = -1;
      }
    } else {
      // assign to stack
      this.stack[this.frameBase + addr] = val.value;
      for (let i = 1; i < val.span; i++) {
        this.stack[this.frameBase + addr + i] = -1;
      }
    }
  }
  private getValue(arg: QuadrupleArg): IExecutionVal {
    // read instance number
    if (arg.type === QuadrupleArgType.VALUE_INST) {
      const valInst = arg as QuadrupleArgValue;
      return {value: valInst.value, span: getPrimitiveSize(valInst.valueType)};
    }
    // read temp
    if (arg.type === QuadrupleArgType.VAR_TEMP) {
      const valTemp = arg as QuadrupleArgVarTemp;
      console.log(valTemp.tempIndex);
      return {value: this.temp[valTemp.tempIndex], span: 1};
    }
    // read stack
    if (arg.type === QuadrupleArgType.TABLE_REF) {
      const valStack = arg as QuadrupleArgTableRef;
      return {value: this.stack[this.frameBase + valStack.index], span: 1}; // TODO: variable size span
    }
    // read stack in array style
    if (arg.type === QuadrupleArgType.ARRAY_ADDR) {
      const valInst = arg as QuadrupleArgArrayAddr;
      const base = (valInst.base as QuadrupleArgTableRef).index;
      const offset = this.getValue(valInst.offset).value;
      console.log(base, offset);
      if (offset > HEAP_BASE) {
        return {value: this.heap[base + offset - HEAP_BASE], span: 1}; // TODO: variable size span
      } else {
        return {value: this.stack[this.frameBase + base + offset], span: 1}; // TODO: variable size span
      }
    }
    // read val
    if (arg.type === QuadrupleArgType.NULL) {
      return {value: 0, span: 0};
    }
    throw new Error();
  }
  private compareByOperator(op: QuadrupleOperator, val1: number, val2: number = 0): boolean {
    switch (op) {
      case QuadrupleOperator.J_EQ: return val1 === val2;
      case QuadrupleOperator.J_NE: return val1 !== val2;
      case QuadrupleOperator.J_GT: return val1 > val2;
      case QuadrupleOperator.J_GTE: return val1 >= val2;
      case QuadrupleOperator.J_LT: return val1 < val2;
      case QuadrupleOperator.J_LTE: return val1 <= val2;
      case QuadrupleOperator.J_EZ: return val1 === 0;
      case QuadrupleOperator.J_NEZ: return val1 !== 0;
    }
    return false;
  }
  private calcByOperator(op: QuadrupleOperator, val1: number, val2: number): IExecutionVal {
    switch (op) {
      case QuadrupleOperator.I_ADD: return { value: val1 + val2, span: getPrimitiveSize(PrimitiveType.INT) };
      case QuadrupleOperator.I_SUB: return { value: val1 - val2, span: getPrimitiveSize(PrimitiveType.INT) };
      case QuadrupleOperator.I_MUL: return { value: val1 * val2, span: getPrimitiveSize(PrimitiveType.INT) };
      case QuadrupleOperator.I_DIV: return { value: val1 / val2, span: getPrimitiveSize(PrimitiveType.INT) };

      // float point (real) arithmetic
      case QuadrupleOperator.R_ADD: return { value: val1 + val2, span: getPrimitiveSize(PrimitiveType.FLOAT) };
      case QuadrupleOperator.R_SUB: return { value: val1 - val2, span: getPrimitiveSize(PrimitiveType.FLOAT) };
      case QuadrupleOperator.R_MUL: return { value: val1 * val2, span: getPrimitiveSize(PrimitiveType.FLOAT) };
      case QuadrupleOperator.R_DIV: return { value: val1 / val2, span: getPrimitiveSize(PrimitiveType.FLOAT) };
    }
    return { value: 0, span: 0 };
  }

  private allocateHeap(size: number) {
    // allocate at the top
    const baseAddress = this.heapTop;
    this.heapTop += size;
    this.pushMsg('allocate heap from ' + baseAddress + ' to ' + this.heapTop + ' of size ' + size);
    return baseAddress;
  }
}
