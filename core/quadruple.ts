export enum QuadrupleOperator {
  J_JMP,
  J_EQ,
  J_NE,
  J_GE,
  J_GEQ,
  J_LE,
  J_LEQ
  J_EZ,
  J_NEZ,
}

export enum QuadrupleArgumentType {

}

export class QuadrupleArgument {
  public type: QuadrupleArgumentType;
}

// tslint:disable-next-line:max-classes-per-file
export class Quadruple {
  public operator: QuadrupleOperator;
  public argument1: QuadrupleArgument;
  public argument2: QuadrupleArgument;
  public result: QuadrupleArgument;
}
