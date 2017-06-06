import { PrimitiveType } from './token';

export enum SymbolEntryType {
  VOID, PRIMITIVE, ARRAY, ARRAY_REF, FUNCTION,
}

export enum SymbolLocation {
  STACK, LOCAL, ARGUMENT,
}

export const getPrimitiveSize = (type: PrimitiveType | 'ref'): number => {
  switch (type) {
    case 'ref': return 4; // reference: array reference, heap reference, etc
    case PrimitiveType.BOOL: return 1;
    case PrimitiveType.CHAR: return 1;
    case PrimitiveType.FLOAT: return 4;
    case PrimitiveType.INT: return 2;
  }
  return 0;
};

class SymbolEntryInfo {
}

export class ValueType extends SymbolEntryInfo {
  public isVoid: boolean;
  public primitiveType: PrimitiveType;

  constructor(type: PrimitiveType) {
    super();
    this.primitiveType = type;
  }

  public get size(): number {
    return getPrimitiveSize(this.primitiveType);
  }
}

class VoidType extends ValueType {
  constructor() {
    super(PrimitiveType.VOID);
    this.isVoid = true;
  }
}

class TypeInfoPrimitive extends ValueType {
  constructor(type: PrimitiveType) {
    super(type);
  }
}

class TypeInfoArray extends ValueType {
  public dimension: number;
  constructor(type: PrimitiveType, dim: number) {
    super(type);
    this.dimension = dim;
  }
  get size() {
    // stack consumption: [ref-to-heap][dim-1][dim-2][dim-n]
    return getPrimitiveSize('ref') + getPrimitiveSize(PrimitiveType.INT) * this.dimension;
  }
  get elementSize() {
    return getPrimitiveSize(this.primitiveType);
  }
}

class TypeInfoArrayRef extends ValueType {
  public dimension: number;
  constructor(type: PrimitiveType, dim: number) {
    super(type);
    this.dimension = dim;
  }
  get size() {
    return getPrimitiveSize('ref');
  }
}

interface IFunctionParameter {
  name: string;
  type: ValueType;
}

class TypeInfoFunction extends SymbolEntryInfo {
  public returnType: ValueType;
  public parameterList: IFunctionParameter[] = [];
  public entryAddress: number;
}

export class SymbolEntry {
  public static create = {
    func: (name: string) => new SymbolEntry(name, SymbolEntryType.FUNCTION, new TypeInfoFunction()),
    prim: (name: string, type: PrimitiveType) =>
      new SymbolEntry(name, SymbolEntryType.PRIMITIVE, new TypeInfoPrimitive(type)),
    arr: (name: string, type: PrimitiveType, dim: number) =>
      new SymbolEntry(name, SymbolEntryType.ARRAY, new TypeInfoArray(type, dim)),
    arrRef: (name: string, type: PrimitiveType, dim: number) =>
      new SymbolEntry(name, SymbolEntryType.ARRAY_REF, new TypeInfoArrayRef(type, dim)),
  };

  public name: string;
  public stackOffset: number = -1;
  public type: SymbolEntryType;
  public info: SymbolEntryInfo;

  public constructor(name: string, type: SymbolEntryType, info: SymbolEntryInfo) {
    this.name = name;
    this.type = type;
    this.info = info;
  }

  public get asFunc(): TypeInfoFunction {
    return this.info as TypeInfoFunction;
  }
  public get asPrim(): TypeInfoPrimitive {
    return this.info as TypeInfoPrimitive;
  }
  public get asArr(): TypeInfoArray {
    return this.info as TypeInfoArray;
  }
  public get asArrRef(): TypeInfoArrayRef {
    return this.info as TypeInfoArrayRef;
  }

  public toString() {
    return this.name + '\t' + SymbolEntryType[this.type] + ' @' + this.stackOffset;
  }
}

export const createValueType = {
  void: () => new VoidType(),
  prim: (type: PrimitiveType) => new TypeInfoPrimitive(type),
  arr: (type: PrimitiveType, dim: number) => new TypeInfoArray(type, dim),
  arrRef: (type: PrimitiveType, dim: number) => new TypeInfoArrayRef(type, dim),
};
