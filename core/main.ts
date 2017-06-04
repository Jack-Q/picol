import { lexer } from './lexer';
import { parser } from './parser';
import { generator } from './quad-gen';

export { Token, TokenType, PrimitiveType } from './token';
export { ParseNode } from './parser-node';
export { Quadruple } from './quadruple';

export default { lexer, generator, parser };
