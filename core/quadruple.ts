import { PrimitiveType } from './token';
export enum QuadrupleOperator {
  // Jump
  J_JMP, // jump unconditionally
  J_EQ,  // jump if equal
  J_NE,  // jump if not equal
  J_GE,  // jump if greater than
  J_GEQ, // jump if greater than or equal
  J_LE,  // jump if less than
  J_LEQ, // jump if less than or equal
  J_EZ,  // jump if equal to zero
  J_NEZ, // jump if not equal to zero

  // integer arithmetic
  I_ADD,
  I_SUB,
  I_MUL,
  I_DIV,

  // float point arithmetic
  F_ADD,
  F_SUB,
  F_MUL,
  F_DIV,

  // primitive variable assignment
  V_ASS,

  // array assignment
  A_ASS,
  A_RET,

  // procedure call
  F_FUNC,
}

export enum QuadrupleArgumentType {
  TABLE_REF,  // variable reference
  VAR_TEMP,   // temporary variable 
  QUAD_REF,   // quadruple table reference
  ARRAY_ADDR, // array reference
  VALUE_INST, // instance value
  NULL, // no item 
}

export class QuadrupleArgument {
  public type: QuadrupleArgumentType;
  protected constructor(type: QuadrupleArgumentType) {
    this.type = type;
  }
  public toString: () => string = () => QuadrupleArgumentType[this.type]
  public get name ():string {return this.toString();}
}

export class QuadrupleArgumentValue extends QuadrupleArgument{
  valueType: PrimitiveType;
  value: any;

  constructor(type: PrimitiveType, value: any) {
    super(QuadrupleArgumentType.VALUE_INST);
    this.value = value;
    this.valueType = type;
  }

  toString = () => `${PrimitiveType[this.valueType]}(${this.value})`
  get name() { return String(this.value);}
}

export class QuadrupleArgumentArrayAddr extends QuadrupleArgument{
  base: QuadrupleArgument;
  offset: QuadrupleArgument;

  constructor(base: QuadrupleArgument, offset: QuadrupleArgument) {
    super(QuadrupleArgumentType.ARRAY_ADDR);
    this.base = base;
    this.offset = offset;
  }

  toString = () => `${this.base.name}[${this.offset.name}]`
}

export class QuadrupleArgumentTableRef extends QuadrupleArgument{
  varName: string;
  index: number;

  constructor(name: string, index: number) {
    super(QuadrupleArgumentType.TABLE_REF);
    this.varName = name;
    this.index = index;
  }

  toString = () => `${[this.varName]}@${this.index}`
  get name() { return String(this.varName);}
}

export class QuadrupleArgumentQuadRef extends QuadrupleArgument{
  quadIndex: number;

  constructor(quadIndex: number) {
    super(QuadrupleArgumentType.QUAD_REF);
    this.quadIndex = quadIndex;
  }

  toString = () => `(${this.quadIndex})`
}

export class QuadrupleArgumentVarTemp extends QuadrupleArgument {
  tempIndex: number;
  constructor(tempIndex: number) {
    super(QuadrupleArgumentType.VAR_TEMP);
    this.tempIndex = tempIndex;
  }
  toString = () => `T_${this.tempIndex}`;
}

export class QuadrupleArgumentNull extends QuadrupleArgument{

  constructor() {
    super(QuadrupleArgumentType.NULL);
  }

  toString = () => `_`
}

// tslint:disable-next-line:max-classes-per-file
export class Quadruple {
  public operator: QuadrupleOperator;
  public argument1: QuadrupleArgument;
  public argument2: QuadrupleArgument;
  public result: QuadrupleArgument;
  public comment: string = '';
  toString() {
    const pan = (str: string) => str + ' '.repeat(12).slice(str.length);
    return `${
      pan(QuadrupleOperator[this.operator])
      }\t ${
      pan(this.argument1.toString())
      }\t ${
      pan(this.argument2.toString())
      }\t ${
      pan(this.result.toString())
      }` + (this.comment ? `\t # `+ this.comment:'');
  }
}
