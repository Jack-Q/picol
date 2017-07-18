import { createValueType, IFunctionParameter, ValueTypeInfo } from './symbol-entry';
import { PrimitiveType } from './token';
interface IBuildInFunction {
  // entry address for this function
  id: number;
  name: string;
  parameters: IFunctionParameter[];
  return: ValueTypeInfo;
  description: string;
}
// definition of build functions
export const buildInFunctions: IBuildInFunction[] = [{
  id: -10,
  name: 'show',
  description: 'print a character to console',
  parameters: [{ name: 'ch', type: createValueType.prim(PrimitiveType.CHAR) }],
  return: createValueType.void(),
}, {
  id: -11,
  name: 'showInt',
  description: 'print an integer to console',
  parameters: [{ name: 'num', type: createValueType.prim(PrimitiveType.INT) }],
  return: createValueType.void(),
}, {
  id: -12,
  name: 'showFloat',
  description: 'print an float point number to console',
  parameters: [{ name: 'num', type: createValueType.prim(PrimitiveType.FLOAT) }],
  return: createValueType.void(),
}, {
  id: -13,
  name: 'showBool',
  description: 'print an boolean value to console',
  parameters: [{ name: 'b', type: createValueType.prim(PrimitiveType.BOOL) }],
  return: createValueType.void(),
}, {
  id: -20,
  name: 'getInt',
  description: 'request an integer from user',
  parameters: [],
  return: createValueType.prim(PrimitiveType.INT),
}, {
  id: -21,
  name: 'getChar',
  description: 'request a character from user',
  parameters: [],
  return: createValueType.prim(PrimitiveType.CHAR),
}, {
  id: -22,
  name: 'getFloat',
  description: 'get a float point number from user',
  parameters: [],
  return: createValueType.prim(PrimitiveType.FLOAT),
}, {
  id: -23,
  name: 'getBool',
  description: 'get a boolean value from user',
  parameters: [],
  return: createValueType.prim(PrimitiveType.BOOL),
}];
