import { PrimitiveType } from './token';
export enum QuadrupleOperator {
  // Jump
  J_JMP, // jump unconditionally
  J_EQ,  // jump if equal
  J_NE,  // jump if not equal
  J_GT,  // jump if greater than
  J_GTE, // jump if greater than or equal
  J_LT,  // jump if less than
  J_LTE, // jump if less than or equal
  J_EZ,  // jump if equal to zero
  J_NEZ, // jump if not equal to zero

  // integer arithmetic
  I_ADD,
  I_SUB,
  I_MUL,
  I_DIV,

  // float point (real) arithmetic
  R_ADD,
  R_SUB,
  R_MUL,
  R_DIV,

  // type conversion
  C_I2F, // int to float
  C_I2C, // int to char
  C_F2I, // float to int
  C_C2I, // char to int

  // primitive variable assignment
  V_ASS,

  // array assignment
  A_ASS, // array assignment
  A_RET, // array retrieval

  // reference assignment
  R_ASS, // assign array reference to target

  // procedure call
  F_PARA, // prepare argument for procedural call
  F_FUNC, // call procedural (control of flow)
  F_REV,  // prepare return value
  F_RET,  // function return (control of flow)
  F_VAL,  // bind return value of function to temp

  // heap memory management
  M_REQ,  // request allocation of heap memory
  M_FREE, // free heap memory
}

export enum QuadrupleArgType {
  TABLE_REF,  // variable reference
  VAR_TEMP,   // temporary variable
  QUAD_REF,   // quadruple table reference
  ARRAY_ADDR, // array reference
  VALUE_INST, // instance value
  NULL, // no item
}

export class QuadrupleArg {
  public type: QuadrupleArgType;
  protected constructor(type: QuadrupleArgType) {
    this.type = type;
  }
  public toString: () => string = () => QuadrupleArgType[this.type];
  public get name(): string { return this.toString(); }
}

export class QuadrupleArgValue extends QuadrupleArg {
  public valueType: PrimitiveType;
  public value: any;

  constructor(type: PrimitiveType, value: any) {
    super(QuadrupleArgType.VALUE_INST);
    this.value = value;
    this.valueType = type;
  }

  public toString = () => `${PrimitiveType[this.valueType]}(${this.value})`;
  get name() { return String(this.value); }
}

export class QuadrupleArgArrayAddr extends QuadrupleArg {
  public base: QuadrupleArg;
  public offset: QuadrupleArg;

  constructor(base: QuadrupleArg, offset: QuadrupleArg) {
    super(QuadrupleArgType.ARRAY_ADDR);
    this.base = base;
    this.offset = offset;
  }

  public toString = () => `${this.base.name}[${this.offset.name}]`;
}

export class QuadrupleArgTableRef extends QuadrupleArg {
  public varName: string;
  public index: number;

  constructor(name: string, index: number) {
    super(QuadrupleArgType.TABLE_REF);
    this.varName = name;
    this.index = index;
  }

  public toString = () => `${[this.varName]}@${this.index}`;
  get name() { return String(this.varName); }
}

export class QuadrupleArgQuadRef extends QuadrupleArg {
  public label: string = '';
  public quadIndex: number;

  constructor(quadIndex: number, label?: string) {
    super(QuadrupleArgType.QUAD_REF);
    this.quadIndex = quadIndex;
    this.label = label || '';
  }

  public toString = () => (this.label ? this.label : '') + `(${this.quadIndex})`;
}

export class QuadrupleArgVarTemp extends QuadrupleArg {
  public tempIndex: number;
  constructor(tempIndex: number) {
    super(QuadrupleArgType.VAR_TEMP);
    this.tempIndex = tempIndex;
  }
  public toString = () => `T_${this.tempIndex}`;
}

export class QuadrupleArgNull extends QuadrupleArg {

  public static Q_NULL: QuadrupleArgNull = new QuadrupleArgNull();

  private constructor() {
    super(QuadrupleArgType.NULL);
  }

  public toString = () => `_`;

}

export class Quadruple {
  public operator: QuadrupleOperator;
  public argument1: QuadrupleArg;
  public argument2: QuadrupleArg;
  public result: QuadrupleArg;
  public comment: string = '';

  public get operatorName() {
    return QuadrupleOperator[this.operator];
  }

  public toString() {
    const pan = (str: string) => str + ' '.repeat(12).slice(str.length);
    return `${pan(this.operatorName)}\t ${
      pan(this.argument1.toString())
      }\t ${
      pan(this.argument2.toString())
      }\t ${
      pan(this.result.toString())
      }` + (this.comment ? `\t # ` + this.comment : '');
  }
}
