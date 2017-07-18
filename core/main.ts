// Main interface of Picol core library

import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { generator } from './lib/quad-gen';

export { ErrorSeverity, ErrorList, PicolError } from './lib/error';

export { Token, TokenType, PrimitiveType, RangePosition } from './lib/token';
export { ParseNode, ParseNodeType, ParseOperatorType } from './lib/parser-node';
export { Quadruple, QuadrupleArgType } from './lib/quadruple';
export { ExecutionContext } from './lib/context';
export { IExecutionParameterProvider, Executor } from './lib/executor';
export { buildInFunctions } from './lib/build-in';

export default { lexer, generator, parser };
