import { lexer } from './lexer';
import { parser } from './parser';
import { generator } from './quad-gen';

export { Token, TokenType, PrimitiveType } from './token';
export { ParseNode, ParseNodeType, ParseOperatorType } from './parser-node';
export { Quadruple, QuadrupleArgType } from './quadruple';

export default { lexer, generator, parser };
