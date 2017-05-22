import {
  getBinaryParseOperator, getOperatorAssociativity,
  getOperatorPriority, ParseNode,
  ParseNodeType, ParseOperatorType } from './parser-node';
import { PrimitiveType, Token, TokenType, TokenTypeUtil } from './token';

class ParserError extends Error {
  public static expect = (e: string, t: Token | null): ParserError =>
    new ParserError(`expecting "${e}" at ${t !== null ? t.getPositionString() : 'the end'}`)
  public static error = (e: string, t: Token | null): ParserError =>
    new ParserError(`${e}, error at ${t !== null ? t.getPositionString() : 'the end'}`)

  public token: Token | null;
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}

interface ITokenSource {
  get: () => Token | null;
  peek: (i?: number) => Token | null;
  adv: (i?: number) => Token | null;
}

type ParseFunc = (src: ITokenSource, ...precedence: ParseNode[]) => ParseNode | null;

const parseExpressionArray: ParseFunc = (src, id) => {
  return null;
};
const parseExpressionInvoke: ParseFunc = (src, id) => {
  return null;
};
const parseExpressionPostUnary: ParseFunc = (src, expr) => {
  const next = src.get();
  if (next !== null && next.type === TokenType.OP_INC_INC) {
    // increment
    src.adv();
    return ParseNode.createExprUnary(ParseOperatorType.UNI_INC_POS, expr);
  }
  if (next !== null && next.type === TokenType.OP_INC_DEC) {
    // decrement
    src.adv();
    return ParseNode.createExprUnary(ParseOperatorType.UNI_DEC_POS, expr);
  }
  return expr;
};
const parseExpressionUnit: ParseFunc = (src) => {
  const handleUnary = (type: ParseOperatorType): ParseNode => {
    src.adv();
    const expr = parseExpressionUnit(src);
    if (expr === null) { throw ParserError.error('incomplete expression', src.get()); }
    return ParseNode.createExprUnary(type, expr);
  };

  const t = src.get();
  if (t === null) { return null; }
  switch (t.type) {
    case TokenType.VAL_NUM_INT:
      src.adv();
      return ParseNode.createExprConstantInt(t.value);
    case TokenType.VAL_NUM_FLOAT:
      src.adv();
      return ParseNode.createExprConstantFloat(t.value);
    case TokenType.VAL_BOOL:
      src.adv();
      return ParseNode.createExprConstantBool(t.value);
    case TokenType.VAL_CHAR:
      src.adv();
      return ParseNode.createExprConstantChar(t.value);
    case TokenType.DIM_L_PAREN:
      src.adv();
      const subExpr = parseExpression(src);
      if (subExpr === null) {
        throw ParserError.expect('expression', src.get());
      }
      const rParen = src.get();
      if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
        throw ParserError.expect(')', rParen);
      }
      src.adv();
      // since the left value wrapped in parenthesis are still left value
      // this check should be delayed to next stage with more information
      // ((i))++ is a valid expression
      return parseExpressionPostUnary(src, subExpr);
    case TokenType.ID_NAME:
      const id = ParseNode.createIdentifier(t.value);
      const next = src.adv();
      if (next !== null && next.type === TokenType.DIM_L_BRACKET) {
        // handle array access
        const array = parseExpressionArray(src, id);
        // for array, the post inc/dec are possible to apply
        return array && parseExpressionPostUnary(src, array);
      }
      if (next != null && next.type === TokenType.DIM_L_PAREN) {
        // handle function invocation
        return parseExpressionInvoke(src, id);
      }
      return id && parseExpressionPostUnary(src, id);
    case TokenType.OP_PLUS:
      return handleUnary(ParseOperatorType.UNI_POSIT);
    case TokenType.OP_MINUS:
      return handleUnary(ParseOperatorType.UNI_NEGATE);
    case TokenType.OP_LOG_NOT:
      return handleUnary(ParseOperatorType.UNI_NOT);
    case TokenType.OP_INC_INC:
      return handleUnary(ParseOperatorType.UNI_INC_PRE);
    case TokenType.OP_INC_DEC:
      return handleUnary(ParseOperatorType.UNI_DEC_PRE);
  }
  return null;
};

const parseExpressionWeight =
  (src: ITokenSource, weight: number, leftParam: ParseNode, initOp: ParseOperatorType): ParseNode => {
  let leftExpr = leftParam;
  let currentOp = initOp;
  let currentWeight = getOperatorPriority(initOp) + getOperatorAssociativity(initOp);

  while (true) {
    const expr = parseExpressionUnit(src);
    if (expr === null) {
      throw ParserError.expect('expression', src.get());
    }

    let t: Token | null = null;
    t = src.get();
    if (t === null || !TokenTypeUtil.isBinOperator(t.type)) {
      return ParseNode.createExprBinary(currentOp, leftExpr, expr);
    }
    const op = getBinaryParseOperator(t.type);
    const w = getOperatorPriority(op);
    if (w < weight) {
      console.log('pop weight');
      return ParseNode.createExprBinary(currentOp, leftExpr, expr);
    }
    src.adv();
    if (w < currentWeight) {
      console.log('push left');
      leftExpr = ParseNode.createExprBinary(currentOp, leftExpr, expr);
      currentOp = op;
      currentWeight = w + getOperatorAssociativity(op);
    } else {
      console.log('push right');
      const updateExpr = parseExpressionWeight(src, currentWeight, expr, op);
      leftExpr = ParseNode.createExprBinary(currentOp, leftExpr, updateExpr);
      t = src.get();
      if (t === null || !TokenTypeUtil.isBinOperator(t.type)) {
        console.log('pop end');
        return leftExpr;
      }
      currentOp = getBinaryParseOperator(t.type);
      currentWeight = getOperatorPriority(currentOp);
      if (currentWeight < weight) {
        console.log('pop weight');
        return leftExpr;
      }
      src.adv();
      console.log('pop right');
      currentWeight += getOperatorAssociativity(currentOp);
    }
  }
};

const parseExpression: ParseFunc = (src) => {
  const expr = parseExpressionUnit(src);
  if (expr === null) {
    throw ParserError.expect('expression', src.get());
  }
  const t = src.get();
  if (t === null) {
    throw ParserError.error('incomplete expression', t);
  }
  if (!TokenTypeUtil.isBinOperator(t.type)) {
    return expr;
  }
  src.adv();
  return parseExpressionWeight(src, 0, expr, getBinaryParseOperator(t.type));
};

const parseArrayDimension: ParseFunc = (src) => {
  return null;
};

const parseArrayType: ParseFunc = (src, type) => {
  const t = src.get();
  if (t === null || t.type !== TokenType.DIM_L_BRACKET) {
    return type || null;
  }
  console.log('arr-type -> arr-dim');
  const dim = parseArrayDimension(src);
  if (dim === null) {
    throw ParserError.expect('Array dimension', t);
  }
  console.log('!! arr type');
  const arrayType = ParseNode.createArrayType(type, dim);

  // use recursion here for array of array ...
  return parseArrayType(src, arrayType);
};

const parseType: ParseFunc = (src) => {
  let t = src.get();
  if (t === null || !TokenTypeUtil.isType(t.type)) { return null; }
  console.log('!! prim type');
  const primType = ParseNode.createPrimitiveType(t.value as PrimitiveType);

  t = src.adv();
  if (t === null || t.type !== TokenType.DIM_L_BRACKET) { return primType; }
  const arrayType = parseArrayType(src, primType);
  return arrayType;
};

const parseStatementSequence: ParseFunc = (src) => {
  return null;
};
const parseStatementReturn: ParseFunc = (src) => {
  return null;
};
const parseStatementIf: ParseFunc = (src) => {
  return null;
};
const parseStatementBreak: ParseFunc = (src) => {
  return null;
};
const parseStatementContinue: ParseFunc = (src) => {
  return null;
};
const parseStatementSwitch: ParseFunc = (src) => {
  return null;
};
const parseStatementDo: ParseFunc = (src) => {
  return null;
};
const parseStatementWhile: ParseFunc = (src) => {
  return null;
};
const parseFunction: ParseFunc = (src, type, id) => {
  return null;
};

const parseDeclareItem: ParseFunc = (src, id) => {
  const t = src.get();
  if (t === null) { return null; }
  if (t.type === TokenType.DIM_COMMA || t.type === TokenType.DIM_SEMICOLON) {
    return ParseNode.createDeclarationItem(id);
  }
  if (t.type === TokenType.OP_ASS_VAL) {
    src.adv();
    const expr = parseExpression(src);
    return expr && ParseNode.createDeclarationItem(id, expr);
  }
  throw ParserError.expect(':= , ;', t);
};

const parseDeclareList: ParseFunc = (src, firstId) => {
  const declareList: ParseNode[] = [];
  let t = src.get();
  let id = firstId ? firstId : null;
  while (true) {
    if (!id) {
      if (t === null || t.type !== TokenType.ID_NAME) { throw ParserError.expect('identifier', t); }
      console.log('!! id');
      id = ParseNode.createIdentifier(t.value);
      t = src.adv();
    }
    console.log('decl list -> decl item');
    const item = parseDeclareItem(src, id);
    if (item === null) {
      throw ParserError.error('cannot parse declaration item', src.get());
    }
    id = null;
    declareList.push(item);
    t = src.get();
    if (t === null || (t.type !== TokenType.DIM_COMMA && t.type !== TokenType.DIM_SEMICOLON)) {
      throw ParserError.expect(', ;', t);
    }

    // skip ', ;'
    src.adv();

    if (t.type === TokenType.DIM_SEMICOLON) {
      console.log('!! declare list');
      return ParseNode.createDeclarationList(declareList);
    }

    t = src.get();
  }
};
const parseStatementDeclaration: ParseFunc = (src) => {
  let t = src.get();
  if (!t || !TokenTypeUtil.isType(t.type)) { return null; }
  console.log('decl -> type');
  const type = parseType(src);
  if (type === null) { return null; }

  // identifier
  t = src.get();
  if (t === null || t.type !== TokenType.ID_NAME) {
    throw ParserError.expect('identifier', t);
  }
  console.log('!! identifier');
  src.adv(); // move after identifier
  const id = ParseNode.createIdentifier(t.value);

  t = src.get();
  if (t === null || ![TokenType.OP_ASS_VAL, TokenType.DIM_COMMA, TokenType.DIM_SEMICOLON].includes(t.type)) {
    throw ParserError.expect(['(', ':=', ';', ','].join(' '), t);
  }
  if (t.type === TokenType.DIM_L_PAREN) {
    console.log('decl -> func decl');
    return parseFunction(src, type, id);
  }
  if (type.type === ParseNodeType.TYPE_ARRAY) {
    // handle array type declaration / function to array
    // in this case, only one identifier is allowed after it
    if (t.type === TokenType.DIM_SEMICOLON) {
      src.adv();
      console.log('!! arr decl');
      return ParseNode.createDeclarationArray(type, id);
    } else if (t.type === TokenType.DIM_COMMA) {
      throw ParserError.error('array declaration can only specify on variable', t);
    } else if (t.type === TokenType.OP_ASS_VAL) {
      throw ParserError.error('array declaration cannot assign value', t);
    }
  } else if (type.type === ParseNodeType.TYPE_PRIMITIVE) {
    if ([TokenType.OP_ASS_VAL, TokenType.DIM_COMMA, TokenType.DIM_SEMICOLON].includes(t.type)) {
      console.log('decl -> decl list');
      const list = parseDeclareList(src, id);
      if (list !== null) {
        console.log('!! prim decl');
        return ParseNode.createDeclarationPrimitive(type, list);
      }
    }
  }
  return null;
};

const parseStatementExprDecl: ParseFunc = (src) => {
  const t = src.get();
  if (!t) { return null; }

  if (TokenTypeUtil.isType(t.type)) {
    console.log('state -> decl');
    return parseStatementDeclaration(src);
  }
  console.log('state -> expr');
  const expr = parseExpression(src);
  const end = src.get();
  if (end === null || end.type !== TokenType.DIM_SEMICOLON) {
    throw ParserError.expect(';', end);
  }
  src.adv();
  return expr;
};

const parseStatement: ParseFunc = (src) => {
  const t = src.get();
  if (!t) { return null; }
  let node = null;
  switch (t.type) {
    case TokenType.DIM_L_BRACKET:
      node = parseStatementSequence(src);
      break;
    case TokenType.KW_RETURN:
      node = parseStatementReturn(src);
      break;
    case TokenType.KW_IF:
      node = parseStatementIf(src);
      break;
    case TokenType.KW_BREAK:
      node = parseStatementBreak(src);
      break;
    case TokenType.KW_CONTINUE:
      node = parseStatementContinue(src);
      break;
    case TokenType.KW_SWITCH:
      node = parseStatementSwitch(src);
      break;
    case TokenType.KW_DO:
      node = parseStatementDo(src);
      break;
    case TokenType.KW_WHILE:
      node = parseStatementWhile(src);
      break;
    default:
      node = parseStatementExprDecl(src);
  }
  return node;
};

const parseSource: ParseFunc = (src) => {
  const node = new ParseNode(ParseNodeType.SRC_SOURCE);
  while (src.get()) {
    const child = parseStatement(src);
    if (child) {
      node.children.push(child);
    } else {
      throw ParserError.error('cannot parse token', src.get());
    }
  }
  return node;
};

export const parser = (tokensWithWhiteSpace: Token[]): ParseNode | null => {
  let tokenIndex = 0;
  const tokens = tokensWithWhiteSpace.filter((tk) => !TokenTypeUtil.isWhiteSpace(tk.type));
  const tokenSource: ITokenSource = {
    get: () => tokens[tokenIndex],
    peek: (i: number = 1) => { console.log('P' + tokenIndex); return tokens[tokenIndex + i]; },
    adv: (i: number = 1) => { console.log('A' + tokenIndex); return tokens[tokenIndex += i]; },
  };

  // The root/initial is a source file
  const ast = parseSource(tokenSource);
  if (ast === null || tokenIndex !== tokens.length) {
    return null;
  }
  return ast;
};
