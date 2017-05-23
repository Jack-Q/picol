export enum QuadrupleOperator {

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
