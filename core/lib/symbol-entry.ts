import { PrimitiveType, RangePosition } from './token';

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

export class SymbolEntryInfo {
}

export enum ValueType {
  VOID, PRIMITIVE, ARRAY, ARRAY_REF,
}

export class ValueTypeInfo extends SymbolEntryInfo {
  public isVoid: boolean;
  public type: ValueType;
  public dim: number = 0;
  public primitiveType: PrimitiveType;

  constructor(
    primitiveType: PrimitiveType,
    type: ValueType = ValueType.PRIMITIVE,
    isVoid: boolean = false,
  ) {
    super();
    this.primitiveType = primitiveType;
    this.type = type;
    this.isVoid = isVoid;
  }

  public get size(): number {
    return getPrimitiveSize(this.primitiveType);
  }
}

class VoidType extends ValueTypeInfo {
  constructor() {
    super(PrimitiveType.VOID, ValueType.VOID, true);
  }
  public toString() {
    return PrimitiveType[this.primitiveType];
  }
}

class TypeInfoPrimitive extends ValueTypeInfo {
  constructor(type: PrimitiveType) {
    super(type, ValueType.PRIMITIVE, false);
  }
  public toString() {
    return PrimitiveType[this.primitiveType];
  }
}

class TypeInfoArray extends ValueTypeInfo {
  public dimension: number;
  constructor(type: PrimitiveType, dim: number) {
    super(type, ValueType.ARRAY);
    this.dimension = dim;
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
    super(type, ValueType.ARRAY_REF);
    this.dimension = dim;
  }
  get size() {
    return getPrimitiveSize('ref');
  }
  public toString() {
    return 'Ref[<' + PrimitiveType[this.primitiveType] + '>]';
  }
}

class TypeInfoFunction extends SymbolEntryInfo {
  public returnType: ValueTypeInfo =  new VoidType();
  public parameterList: IFunctionParameter[] = [];
  public entryAddress: number = 0;
  public toString() {
    return '(' +
      (this.parameterList ? this.parameterList.map((p) => p.type && p.type.toString()).join(',') : '***')
      + ')=>' + this.returnType.toString();
  }
}

export class SymbolEntry {
  public static create = {
    func: (name: string, srcPosition: RangePosition | null) =>
      new SymbolEntry(name, SymbolEntryType.FUNCTION, new TypeInfoFunction(), srcPosition),
    prim: (name: string, type: PrimitiveType, srcPosition: RangePosition | null) =>
      new SymbolEntry(name, SymbolEntryType.PRIMITIVE, new TypeInfoPrimitive(type), srcPosition),
    arr: (name: string, type: PrimitiveType, dim: number, srcPosition: RangePosition | null) =>
      new SymbolEntry(name, SymbolEntryType.ARRAY, new TypeInfoArray(type, dim), srcPosition),
    arrRef: (name: string, type: PrimitiveType, dim: number, srcPosition: RangePosition | null) =>
      new SymbolEntry(name, SymbolEntryType.ARRAY_REF, new TypeInfoArrayRef(type, dim), srcPosition),
  };

  public name: string;
  public stackOffset: number = -1;
  public type: SymbolEntryType;
  public info: SymbolEntryInfo;
  public srcPosition: RangePosition | null;

  public constructor(name: string, type: SymbolEntryType, info: SymbolEntryInfo, srcPosition: RangePosition | null) {
    this.name = name;
    this.type = type;
    this.info = info;
    this.srcPosition = srcPosition;
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

  public get typeString(): string {
    return SymbolEntryType[this.type];
  }

  public toString() {
    return this.name + '\t' + SymbolEntryType[this.type] + ' '
      + this.info.toString() +
      (this.type === SymbolEntryType.FUNCTION ?
        '@' + this.asFunc.entryAddress
        : ' @' + this.stackOffset);
  }
}

export const createValueType = {
  void: () => new VoidType(),
  prim: (type: PrimitiveType) => new TypeInfoPrimitive(type),
  arr: (type: PrimitiveType, dim: number) => new TypeInfoArray(type, dim),
  arrRef: (type: PrimitiveType, dim: number) => new TypeInfoArrayRef(type, dim),
};
