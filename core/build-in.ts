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
  description: 'print character to console',
  parameters: [{ name: 'ch', type: createValueType.prim(PrimitiveType.CHAR) }],
  return: createValueType.void(),
}, {
  id: -11,
  name: 'showInt',
  description: 'print integer to console',
  parameters: [{ name: 'num', type: createValueType.prim(PrimitiveType.INT) }],
  return: createValueType.void(),
}, {
  id: -12,
  name: 'getInt',
  description: 'get an integer from user',
  parameters: [],
  return: createValueType.prim(PrimitiveType.CHAR),
}, {
  id: -13,
  name: 'getChar',
  description: 'get an character from user',
  parameters: [],
  return: createValueType.prim(PrimitiveType.INT),
}];
