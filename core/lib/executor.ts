import { buildInFunctions } from './build-in';
import { ErrorSeverity } from './error';
import {
  Quadruple, QuadrupleArg, QuadrupleArgArrayAddr, QuadrupleArgQuadRef, QuadrupleArgTableRef,
  QuadrupleArgType, QuadrupleArgValue, QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
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

export interface IExecutionParameterProvider {
  getInteger: () => Promise<number>;
  getFloat: () => Promise<number>;
  getChar: () => Promise<string>;
  getBoolean: () => Promise<boolean>;
}

const HEAP_BASE = 10000;

const arraySet = <T>(arr: T[], ind: number, ele: T): void => {
  if (arr.length <= ind) {
    arr.length = ind + 1;
  }
  arr.splice(ind, 1, ele);
};

export class Executor {
  public pc: number;
  public frameBase: number;
  public stack: number[];
  public stackTop: number;
  public heapTop: number;
  public heap: number[];
  public temp: number[];
  public program: Quadruple[];
  public console: IConsoleMessage[];
  public parameterProvider: IExecutionParameterProvider;

  constructor(provider: IExecutionParameterProvider, program?: Quadruple[]) {
    this.console = [];
    this.parameterProvider = provider;
    if (program) {
      this.program = program;
    }
    this.reset();
  }

  public async step() {
    if (this.pc < 0) {
      // build in function invocation
      await this.invokeBuildIn();
    }
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
          arraySet(this.temp, target.tempIndex, result.value);
        }
        break;

      // type conversion operation
      case QuadrupleOperator.C_I2C:
      case QuadrupleOperator.C_I2F:
      case QuadrupleOperator.C_C2I:
      case QuadrupleOperator.C_F2I:
        {
          const val = this.getValue(quad.argument1);
          const result = this.convertByOperator(quad.operator, val.value);
          const target = quad.result as QuadrupleArgVarTemp;
          console.log(target, result);
          arraySet(this.temp, target.tempIndex, result.value);
        }
        break;

      // primitive variable assignment
      case QuadrupleOperator.V_ASS:
        {
          const val = quad.argument1 as QuadrupleArgValue;
          const dst = quad.result as QuadrupleArgTableRef;
          this.stackFill(dst.index, this.getValue(val));
        }
        break;
      // array assignment
      case QuadrupleOperator.A_ASS: // array assignment
        {
          const val = quad.argument1 as QuadrupleArgValue;
          const dst = quad.result as QuadrupleArgArrayAddr;
          const base = dst.base.type === QuadrupleArgType.TABLE_REF
            ? (dst.base as QuadrupleArgTableRef).index : this.getValue(dst.base).value;
          const offset = this.getValue(dst.offset).value;
          this.stackFill(base + offset, this.getValue(val));
        }
        break;
      case QuadrupleOperator.A_RET: // array retrieval
        {
          const data = this.getValue(quad.argument1);
          const target = quad.result as QuadrupleArgVarTemp;
          arraySet(this.temp, target.tempIndex, data.value);
        }
        break;

      // reference assignment
      case QuadrupleOperator.R_ASS: // assign array reference to target
        {
          // array reference copy
          const val = quad.argument1 as QuadrupleArgTableRef;

          const dst = quad.result as QuadrupleArgTableRef;
          this.stackFill(dst.index, {
            value: val.index, span: getPrimitiveSize('ref') });
        }
        break;

      // procedure call
      case QuadrupleOperator.F_PARA: // prepare argument for procedural call
        {
          // F_PARA VAL _ ADDR
          const value = this.getValue(quad.argument1);
          const target = this.getValue((quad.result as QuadrupleArgArrayAddr).offset);
          this.stackFill(target.value, value);
        }
        break;
      case QuadrupleOperator.F_FUNC: // call procedural (control of flow)
        {
          // F_FUNC FRAME_BASE _ ADDR
          const frameBase = this.getValue(quad.argument1).value;
          const funcAddr = (quad.result as QuadrupleArgQuadRef).quadIndex;

          const oldNextPc = this.pc;
          const oldFrameBase = this.frameBase;
          this.frameBase += frameBase;
          this.pc = funcAddr;

          // set parent frame base
          const parentFrameBase = { value: oldFrameBase, span: getPrimitiveSize(PrimitiveType.INT) };
          this.stackFill(0, parentFrameBase);
          // set return addr (old pc)
          const parentNextPc = { value: oldNextPc, span: getPrimitiveSize(PrimitiveType.INT) };
          this.stackFill(parentFrameBase.span, parentNextPc);
        }
        break;
      case QuadrupleOperator.F_REV:  // prepare return value
        {
          // F_REV is just alike assign
        }
        break;
      case QuadrupleOperator.F_RET:  // function return (control of flow)
        {
          this.pc = this.stack[this.frameBase + getPrimitiveSize(PrimitiveType.INT)];
          this.frameBase = this.stack[this.frameBase];
        }
        break;
      case QuadrupleOperator.F_VAL:  // bind return value of function to temp
        {
          const val1 = this.getValue(quad.argument1);
          const target = quad.result as QuadrupleArgVarTemp;
          arraySet(this.temp, target.tempIndex, val1.value);
        }
        break;
      // heap memory management
      case QuadrupleOperator.M_REQ:  // request allocation of heap memory
        {
          const size = this.getValue(quad.argument1).value;
          const target = quad.result as QuadrupleArgVarTemp;
          const address = this.allocateHeap(size);
          arraySet(this.temp, target.tempIndex, address);
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
    this.stackTop = 0;
    this.heapTop = HEAP_BASE;
    this.heap = [];
    this.stack = [];
    this.temp = [];
  }

  public pushError(message: string, severity: ErrorSeverity = ErrorSeverity.ERROR) {
    this.console.push({ message, severity });
  }
  public pushMsg(message: string, severity: ErrorSeverity = ErrorSeverity.INFO) {
    this.console.push({ message, severity });
  }
  private stackFill(addr: number, val: IExecutionVal) {
    if (addr >= HEAP_BASE) {
      // assign to heap
      arraySet(this.heap, addr - HEAP_BASE, val.value);
      for (let i = 1; i < val.span; i++) {
        arraySet(this.heap, addr + i - HEAP_BASE, -1);
      }
    } else {
      // assign to stack
      arraySet(this.stack, this.frameBase + addr, val.value);
      for (let i = 1; i < val.span; i++) {
        arraySet(this.stack, this.frameBase + addr + i, -1);
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
      const base = valInst.base.type === QuadrupleArgType.TABLE_REF
        ? (valInst.base as QuadrupleArgTableRef).index : this.getValue(valInst.base).value;
      const offset = this.getValue(valInst.offset).value;
      console.log(base, offset);
      if (base >= HEAP_BASE) {
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

  private convertByOperator(op: QuadrupleOperator, val: number): IExecutionVal {
    switch (op) {
      case QuadrupleOperator.C_C2I: return { value: val, span: getPrimitiveSize(PrimitiveType.INT) };
      case QuadrupleOperator.C_F2I: return { value: Math.round(val), span: getPrimitiveSize(PrimitiveType.INT) };
      // tslint:disable-next-line:no-bitwise
      case QuadrupleOperator.C_I2C: return { value: val & 0xff, span: getPrimitiveSize(PrimitiveType.CHAR) };
      case QuadrupleOperator.C_I2F: return { value: val, span: getPrimitiveSize(PrimitiveType.FLOAT) };
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

  private async invokeBuildIn() {
    const id = this.pc; // use program counter (negative) for entry point of build in function
    const func = buildInFunctions.find((f) => f.id === this.pc);
    if (!func) {
      this.pushError('undefined build in function invocation', ErrorSeverity.FATAL);
      return;
    }

    const params: any[] = [];
    func.parameters.reduce((position, para) => {
      params.push(this.stack[position]);
      return position + para.type.size;
    }, this.frameBase + 2 * getPrimitiveSize(PrimitiveType.INT) + func.return.size);
    const result = await this.executeBuildIn(func.name, params);

    // assign return value
    if (!func.return.isVoid) {
      this.stackFill(2 * getPrimitiveSize(PrimitiveType.INT), {
        value: result,
        span: func.return.size,
      });
    }

    // return
    this.pc = this.stack[this.frameBase + getPrimitiveSize(PrimitiveType.INT)];
    this.frameBase = this.stack[this.frameBase];
  }

  private async executeBuildIn(name: string, param: any[]) {
    // implementation of build-in functions
    const buildInImpl: { [name: string]: (...arg: any[]) => PromiseLike<any> } = {
      // message output functions
      show: async (ch: string) => this.pushMsg(ch, ErrorSeverity.INFO),
      showInt: async (int: number) => this.pushMsg(int + '', ErrorSeverity.INFO),
      showFloat: async (float: number) => this.pushMsg(float + '', ErrorSeverity.INFO),
      showBool: async (bool: boolean) => this.pushMsg(bool + '', ErrorSeverity.INFO),

      // message input functions
      getInt: async () => await this.parameterProvider.getInteger(),
      getChar: async () => await this.parameterProvider.getChar(),
      getFloat: async () => await this.parameterProvider.getFloat(),
      getBool: async () => await this.parameterProvider.getBoolean(),
    };
    return await buildInImpl[name](...param);
  }
}
