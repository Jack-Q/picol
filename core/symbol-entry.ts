import { PrimitiveType } from './token';

export interface IFunctionParameter {
  name: string;
  type: ValueTypeInfo;
}

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

export enum ValueType {
  VOID, PRIMITIVE, ARRAY, ARRAY_REF,
}

export class ValueTypeInfo extends SymbolEntryInfo {
  public isVoid: boolean;
  public type: ValueType;
  public dim: number = 0;
  public primitiveType: PrimitiveType;

  constructor(type: PrimitiveType) {
    super();
    this.primitiveType = type;
  }

  public get size(): number {
    return getPrimitiveSize(this.primitiveType);
  }
}

class VoidType extends ValueTypeInfo {
  constructor() {
    super(PrimitiveType.VOID);
    this.isVoid = true;
    this.type = ValueType.VOID;
  }
  public toString() {
    return PrimitiveType[this.primitiveType];
  }
}

class TypeInfoPrimitive extends ValueTypeInfo {
  constructor(type: PrimitiveType) {
    super(type);
    this.type = ValueType.PRIMITIVE;
  }
  public toString() {
    return PrimitiveType[this.primitiveType];
  }
}

class TypeInfoArray extends ValueTypeInfo {
  public dimension: number;
  constructor(type: PrimitiveType, dim: number) {
    super(type);
    this.dimension = dim;
    this.type = ValueType.ARRAY;
  }
  get size() {
    // stack consumption: [ref-to-heap][dim-1][dim-2][dim-n]
    // the size of each dimension is stored as int
    return getPrimitiveSize('ref') + getPrimitiveSize(PrimitiveType.INT) * this.dimension;
  }

  get elementSize() {
    return getPrimitiveSize(this.primitiveType);
  }

  public toString() {
    return '<' + PrimitiveType[this.primitiveType] + '>[' +
      ','.repeat(this.dimension - 1 < 0 ? 0 : this.dimension - 1) + ']';
  }
}

class TypeInfoArrayRef extends ValueTypeInfo {
  public dimension: number;
  constructor(type: PrimitiveType, dim: number) {
    super(type);
    this.dimension = dim;
    this.type = ValueType.ARRAY_REF;
  }
  get size() {
    return getPrimitiveSize('ref');
  }
  public toString() {
    return 'Ref[<' + PrimitiveType[this.primitiveType] + '>]';
  }
}

class TypeInfoFunction extends SymbolEntryInfo {
  public returnType: ValueTypeInfo;
  public parameterList: IFunctionParameter[] = [];
  public entryAddress: number;
  public toString() {
    return '(' +
      (this.parameterList ? this.parameterList.map((p) => p.type && p.type.toString()).join(',') : '***')
      + ')=>' + this.returnType.toString();
  }
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
    return this.name + '\t' + SymbolEntryType[this.type] + ' '
      + this.info.toString() + ' @' + this.stackOffset;
  }
}

export const createValueType = {
  void: () => new VoidType(),
  prim: (type: PrimitiveType) => new TypeInfoPrimitive(type),
  arr: (type: PrimitiveType, dim: number) => new TypeInfoArray(type, dim),
  arrRef: (type: PrimitiveType, dim: number) => new TypeInfoArrayRef(type, dim),
};
