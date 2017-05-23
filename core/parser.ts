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

// arr[a,b,c][a,b,c]
const parseExpressionArray: ParseFunc = (src, id) => {
  const t = src.get();
  if (t === null || t.type !== TokenType.DIM_L_BRACKET) {
    return id || null;
  }
  const dim = parseArrayDimension(src);
  if (dim === null) {
    throw ParserError.expect('Array dimension', t);
  }
  const arrAccess = ParseNode.createArrayAccess(id, dim);

  // use recursion here for array of array ...
  return parseArrayType(src, arrAccess);
};

// func(a,b,c)
const parseExpressionInvoke: ParseFunc = (src, id) => {
  // id is processed, current cursor position ought to be placed at (
  const lParen = src.get();
  if (lParen === null || lParen.type !== TokenType.DIM_L_PAREN) {
    throw ParserError.expect('(', lParen);
  }
  src.adv();
  const node = new ParseNode(ParseNodeType.SEG_INVOKE_ARG_LIST);
  while (true) {
    const exp = parseExpression(src);
    if (exp === null) {
      throw ParserError.expect('dim expr', src.get());
    }
    node.addChild(exp);

    const comma = src.get();
    if (comma === null) {
      throw ParserError.expect(') ,', comma);
    }
    if (comma.type === TokenType.DIM_COMMA) {
      src.adv();
      continue;
    }
    if (comma.type === TokenType.DIM_R_PAREN) {
      src.adv();
      const invocation = new ParseNode(ParseNodeType.EXPR_FUNC_INVOKE);
      invocation.addChild(id);
      invocation.addChild(node);
      return invocation;
    }
    throw ParserError.expect(') ,', comma);
  }
};

// i++, i--
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

// +a, -a, !a, ++a, --a, a++, a--, + + a, arr[a], a(1), (expr)...
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

// helper function for determine operator priority
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
      return ParseNode.createExprBinary(currentOp, leftExpr, expr);
    }
    src.adv();
    if (w < currentWeight) {
      leftExpr = ParseNode.createExprBinary(currentOp, leftExpr, expr);
      currentOp = op;
      currentWeight = w + getOperatorAssociativity(op);
    } else {
      const updateExpr = parseExpressionWeight(src, currentWeight, expr, op);
      leftExpr = ParseNode.createExprBinary(currentOp, leftExpr, updateExpr);
      t = src.get();
      if (t === null || !TokenTypeUtil.isBinOperator(t.type)) {
        return leftExpr;
      }
      currentOp = getBinaryParseOperator(t.type);
      currentWeight = getOperatorPriority(currentOp);
      if (currentWeight < weight) {
        return leftExpr;
      }
      src.adv();
      currentWeight += getOperatorAssociativity(currentOp);
    }
  }
};

// expression
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

// [1,2,3]
const parseArrayDimension: ParseFunc = (src) => {
  const lBracket = src.get();
  if (lBracket === null || lBracket.type !== TokenType.DIM_L_BRACKET) {
    throw ParserError.expect('[', lBracket);
  }
  src.adv();
  const node = new ParseNode(ParseNodeType.SEG_ARRAY_DIM);
  while (true) {
    const exp = parseExpression(src);
    if (exp === null) {
      throw ParserError.expect('dim expr', src.get());
    }
    node.addChild(exp);

    const comma = src.get();
    if (comma === null) {
      throw ParserError.expect('] ,', comma);
    }
    if (comma.type === TokenType.DIM_COMMA) {
      src.adv();
      continue;
    }
    if (comma.type === TokenType.DIM_R_BRACKET) {
      src.adv();
      return node;
    }
    throw ParserError.expect('] ,', comma);
  }
};

// int[1,2,3]
const parseArrayType: ParseFunc = (src, type) => {
  const t = src.get();
  if (t === null || t.type !== TokenType.DIM_L_BRACKET) {
    return type || null;
  }
  const dim = parseArrayDimension(src);
  if (dim === null) {
    throw ParserError.expect('Array dimension', t);
  }
  const arrayType = ParseNode.createArrayType(type, dim);

  // use recursion here for array of array ...
  return parseArrayType(src, arrayType);
};

// int a(int m, int n){}
const parseType: ParseFunc = (src) => {
  let t = src.get();
  if (t === null || !TokenTypeUtil.isType(t.type)) { return null; }
  const primType = ParseNode.createPrimitiveType(t.value as PrimitiveType);

  t = src.adv();
  if (t === null || t.type !== TokenType.DIM_L_BRACKET) { return primType; }
  const arrayType = parseArrayType(src, primType);
  return arrayType;
};

// { stat1; stat2; }
const parseStatementSequence: ParseFunc = (src) => {
  const lCurly = src.get();
  if (lCurly === null || lCurly.type !== TokenType.DIM_L_CURLY) {
    return null;
  }
  // skip left curly
  src.adv();
  const node = new ParseNode(ParseNodeType.STAT_SEQUENCE);
  while (true) {
    const rCurly = src.get();
    if (rCurly === null) {
      throw ParserError.expect('}', rCurly);
    }
    // get paring right curly, close block
    if (rCurly.type === TokenType.DIM_R_CURLY) {
      src.adv();
      return node;
    }
    const child = parseStatement(src);
    if (child) {
      node.children.push(child);
    } else {
      throw ParserError.error('cannot parse token', src.get());
    }
  }
};

// return expr;
const parseStatementReturn: ParseFunc = (src) => {
  const ret = src.get();
  if (ret === null || ret.type !== TokenType.KW_RETURN) {
    return null;
  }
  src.adv();
  const voidExpr = src.get();
  if (voidExpr !== null && voidExpr.type === TokenType.DIM_SEMICOLON) {
    src.adv();
    const node = new ParseNode(ParseNodeType.STAT_RETURN_VOID);
    return node;
  }
  const expr = parseExpression(src);
  const semicolon = src.get();
  if (semicolon === null || semicolon.type !== TokenType.DIM_SEMICOLON) {
    throw ParserError.expect(';', semicolon);
  }
  src.adv();
  const node = new ParseNode(ParseNodeType.STAT_RETURN);
  node.addChild(expr);
  return node;
};

// if(condition) {}, if(condition) {} else {}
const parseStatementIf: ParseFunc = (src) => {
  const ifBegin = src.get();
  if (ifBegin === null || ifBegin.type !== TokenType.KW_IF) {
    return null;
  }
  const lParen = src.adv();
  if (lParen === null || lParen.type !== TokenType.DIM_L_PAREN) {
    throw ParserError.expect('(', lParen);
  }
  src.adv();
  const condition = parseExpression(src);
  const rParen = src.get();
  if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
    throw ParserError.expect(')', rParen);
  }
  src.adv();
  const blockIfTrue = parseStatement(src);
  const elseBegin = src.get();
  if (elseBegin === null || elseBegin.type !== TokenType.KW_ELSE) {
    // no else clause for this if statement
    const node = new ParseNode(ParseNodeType.STAT_IF);
    node.addChild(condition);
    node.addChild(blockIfTrue);
    return node;
  }
  // skip "else"
  src.adv();
  const blockIfFalse = parseStatement(src);
  const node = new ParseNode(ParseNodeType.STAT_IF_ELSE);
  node.addChild(condition);
  node.addChild(blockIfTrue);
  node.addChild(blockIfFalse);
  return node;
};

// break;
const parseStatementBreak: ParseFunc = (src) => {
  const br = src.get();
  if (br === null || br.type !== TokenType.KW_BREAK) {
    return null;
  }
  const semicolon = src.adv();
  if (semicolon === null || semicolon.type !== TokenType.DIM_SEMICOLON) {
    throw ParserError.expect(';', semicolon);
  }
  src.adv();
  return new ParseNode(ParseNodeType.STAT_BREAK);
};

// continue;
const parseStatementContinue: ParseFunc = (src) => {
  const cnt = src.get();
  if (cnt === null || cnt.type !== TokenType.KW_CONTINUE) {
    return null;
  }
  const semicolon = src.adv();
  if (semicolon === null || semicolon.type !== TokenType.DIM_SEMICOLON) {
    throw ParserError.expect(';', semicolon);
  }
  src.adv();
  return new ParseNode(ParseNodeType.STAT_CONTINUE);
};

// {case exp: stat; break; default: stat;}
const parseSwitchBody: ParseFunc = (src) => {
  const lCurly = src.get();
  if (lCurly === null || lCurly.type !== TokenType.DIM_L_CURLY) {
    throw ParserError.expect('{', lCurly);
  }
  // skip left curly
  src.adv();
  const node = new ParseNode(ParseNodeType.SEG_SWITCH_BODY);
  while (true) {
    const next = src.get();
    if (next === null) {
      throw ParserError.expect('}', next);
    }
    // get paring right curly, close block
    if (next.type === TokenType.DIM_R_CURLY) {
      src.adv();
      return node;
    }

    // case label
    if (next.type === TokenType.KW_CASE) {
      src.adv();
      const expr = parseExpression(src);
      if (expr === null) {
        throw ParserError.expect('expr', src.get());
      }
      const colon = src.get();
      if (colon === null || colon.type !== TokenType.DIM_COLON) {
        throw ParserError.expect(':', colon);
      }
      // skip the colon
      src.adv();
      const caseNode = new ParseNode(ParseNodeType.SEG_CASE_LABEL);
      caseNode.addChild(expr);
      node.addChild(caseNode);
      continue;
    }

    // default label
    if (next.type === TokenType.KW_DEFAULT) {
      src.adv();
      const colon = src.get();
      if (colon === null || colon.type !== TokenType.DIM_COLON) {
        throw ParserError.expect(':', colon);
      }
      // skip the colon
      src.adv();
      node.addChild(new ParseNode(ParseNodeType.SEG_DEFAULT_LABEL));
      continue;
    }

    // General statement
    const child = parseStatement(src);
    if (child) {
      node.children.push(child);
    } else {
      throw ParserError.error('cannot parse token', src.get());
    }
  }

};

// switch(exp) switchBody
const parseStatementSwitch: ParseFunc = (src) => {
  const switchBegin = src.get();
  if (switchBegin === null || switchBegin.type !== TokenType.KW_SWITCH) {
    return null;
  }
  const lParen = src.adv();
  if (lParen === null || lParen.type !== TokenType.DIM_L_PAREN) {
    throw ParserError.expect('(', lParen);
  }
  src.adv();
  const criteria = parseExpression(src);
  const rParen = src.get();
  if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
    throw ParserError.expect(')', rParen);
  }
  src.adv();
  const switchBody = parseSwitchBody(src);
  const node = new ParseNode(ParseNodeType.STAT_SWITCH);
  node.addChild(criteria);
  node.addChild(switchBody);
  return node;
};

// do {} while (exp);
const parseStatementDo: ParseFunc = (src) => {
  const doBegin = src.get();
  if (doBegin === null || doBegin.type !== TokenType.KW_DO) {
    return null;
  }
  src.adv();
  const loopBlock = parseStatement(src);
  if (loopBlock === null) {
    throw ParserError.error('the loop block is required', src.get());
  }
  const whileBegin = src.get();
  if (whileBegin === null || whileBegin.type !== TokenType.KW_WHILE) {
    throw ParserError.expect('while', whileBegin);
  }

  const lParen = src.adv();
  if (lParen === null || lParen.type !== TokenType.DIM_L_PAREN) {
    throw ParserError.expect('(', lParen);
  }
  src.adv();

  const condition = parseExpression(src);

  const rParen = src.get();
  if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
    throw ParserError.expect(')', rParen);
  }
  const semicolon = src.adv();

  if (semicolon === null || semicolon.type !== TokenType.DIM_SEMICOLON) {
    throw ParserError.expect(';', semicolon);
  }
  src.adv();
  const node = new ParseNode(ParseNodeType.STAT_DO);
  node.addChild(loopBlock);
  node.addChild(condition);
  return node;
};

// while (expr) {}
const parseStatementWhile: ParseFunc = (src) => {
  const whileBegin = src.get();
  if (whileBegin === null || whileBegin.type !== TokenType.KW_WHILE) {
    return null;
  }
  const lParen = src.adv();
  if (lParen === null || lParen.type !== TokenType.DIM_L_PAREN) {
    throw ParserError.expect('(', lParen);
  }
  src.adv();
  const condition = parseExpression(src);
  const rParen = src.get();
  if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
    throw ParserError.expect(')', rParen);
  }
  src.adv();
  const loopBlock = parseStatement(src);
  const node = new ParseNode(ParseNodeType.STAT_WHILE);
  node.addChild(condition);
  node.addChild(loopBlock);
  return node;
};

// (int a, int b, int c)
const parseFunctionParam: ParseFunc = (src) => {
  const node = new ParseNode(ParseNodeType.SEG_FUNCTION_PARAM_LIST);

  const emptyRParen = src.get();
  if (emptyRParen === null || emptyRParen.type === TokenType.DIM_R_PAREN) {
    // empty list (maybe incomplete)
    return node;
  }

  while (true) {
    // get type
    const type = parseType(src);
    if (type === null) {
      throw ParserError.expect('type', src.get());
    }

    const id = src.get();
    if (id === null || id.type !== TokenType.ID_NAME) {
      throw ParserError.expect('id', src.get());
    }
    src.adv();

    const item = new ParseNode(ParseNodeType.SEG_FUNCTION_PARAM_ITEM);
    item.addChild(type);
    item.addChild(ParseNode.createIdentifier(id.value));
    node.addChild(item);

    const comma = src.get();
    if (comma === null || comma.type === TokenType.DIM_R_PAREN) {
      return node;
    }

    if (comma.type !== TokenType.DIM_COMMA) {
      throw ParserError.expect(',', comma);
    }
    src.adv();
  }
};

// int a (Params) {}
const parseFunction: ParseFunc = (src, type, id) => {
  // this requires the type of return value and the identifier of function
  // is provided, current checking point is at the left parenthesis
  if (!type || !id) {
    throw ParserError.error('function type and identifer are required', src.get());
  }
  const lParen = src.get();
  if (lParen === null || lParen.type !== TokenType.DIM_L_PAREN) {
    throw ParserError.expect('(', lParen);
  }
  src.adv();

  const param = parseFunctionParam(src);

  const rParen = src.get();
  if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
    throw ParserError.expect(')', rParen);
  }
  src.adv();

  const body = parseStatementSequence(src);

  if (body === null) {
    throw ParserError.expect('body', src.get());
  }

  const node = new ParseNode(ParseNodeType.STAT_FUNCTION);
  node.addChild(param);
  node.addChild(body);

  return node;
};

// a, a := 10
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

// a, b:= 10, c := a
const parseDeclareList: ParseFunc = (src, firstId) => {
  const declareList: ParseNode[] = [];
  let t = src.get();
  let id = firstId ? firstId : null;
  while (true) {
    if (!id) {
      if (t === null || t.type !== TokenType.ID_NAME) { throw ParserError.expect('identifier', t); }
      id = ParseNode.createIdentifier(t.value);
      t = src.adv();
    }
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
      return ParseNode.createDeclarationList(declareList);
    }

    t = src.get();
  }
};

// int declarationList; int[arr] a;
const parseStatementDeclaration: ParseFunc = (src) => {
  let t = src.get();
  if (!t || !TokenTypeUtil.isType(t.type)) { return null; }
  const type = parseType(src);
  if (type === null) { return null; }

  // identifier
  t = src.get();
  if (t === null || t.type !== TokenType.ID_NAME) {
    throw ParserError.expect('identifier', t);
  }
  src.adv(); // move after identifier
  const id = ParseNode.createIdentifier(t.value);

  t = src.get();
  if (t === null || ![
    TokenType.OP_ASS_VAL,    // := --> int a := 10;
    TokenType.DIM_COMMA,     // ,  --> int a, b;
    TokenType.DIM_L_PAREN,   // (  --> int a (int b){}
    TokenType.DIM_SEMICOLON, // ;  --> int a;
  ].includes(t.type)) {
    throw ParserError.expect(['(', ':=', ';', ','].join(' '), t);
  }
  if (t.type === TokenType.DIM_L_PAREN) {
    return parseFunction(src, type, id);
  }
  if (type.type === ParseNodeType.TYPE_ARRAY) {
    // handle array type declaration / function to array
    // in this case, only one identifier is allowed after it
    if (t.type === TokenType.DIM_SEMICOLON) {
      src.adv();
      return ParseNode.createDeclarationArray(type, id);
    } else if (t.type === TokenType.DIM_COMMA) {
      throw ParserError.error('array declaration can only specify on variable', t);
    } else if (t.type === TokenType.OP_ASS_VAL) {
      throw ParserError.error('array declaration cannot assign value', t);
    }
  } else if (type.type === ParseNodeType.TYPE_PRIMITIVE) {
    if ([TokenType.OP_ASS_VAL, TokenType.DIM_COMMA, TokenType.DIM_SEMICOLON].includes(t.type)) {
      const list = parseDeclareList(src, id);
      if (list !== null) {
        return ParseNode.createDeclarationPrimitive(type, list);
      }
    }
  }
  return null;
};

// expression or declaration
const parseStatementExprDecl: ParseFunc = (src) => {
  const t = src.get();
  if (!t) { return null; }

  if (TokenTypeUtil.isType(t.type)) {
    return parseStatementDeclaration(src);
  }
  const expr = parseExpression(src);
  const end = src.get();
  if (end === null || end.type !== TokenType.DIM_SEMICOLON) {
    throw ParserError.expect(';', end);
  }
  src.adv();
  return expr;
};

// statement
const parseStatement: ParseFunc = (src) => {
  const t = src.get();
  if (!t) { return null; }
  let node = null;
  switch (t.type) {
    case TokenType.DIM_L_CURLY:
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

// source file abstraction
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

export const parser = (tokensWithWhiteSpace: Token[]): ParseNode => {
  let tokenIndex = 0;
  const tokens = tokensWithWhiteSpace.filter((tk) => !TokenTypeUtil.isWhiteSpace(tk.type));
  const tokenSource: ITokenSource = {
    get: () => tokens[tokenIndex] || null,
    peek: (i: number = 1) => tokens[tokenIndex + i],
    adv: (i: number = 1) => tokens[tokenIndex += i],
  };

  // The root/initial is a source file
  const ast = parseSource(tokenSource);
  if (ast === null || tokenIndex !== tokens.length) {
    throw ParserError.error('parsing failed', tokenSource.get());
  }
  return ast;
};
