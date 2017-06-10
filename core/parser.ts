import { ErrorList, errorName, ParserError, PicolError } from './error';
import {
  getBinaryParseOperator, getOperatorAssociativity,
  getOperatorPriority, ParseNode,
  ParseNodeType, ParseOperatorType } from './parser-node';
import { PrimitiveType, Token, TokenType, TokenTypeUtil } from './token';

export interface IParserResult {
  errorList: PicolError[];
  ast: ParseNode | null;
}

interface ITokenSource {
  get: () => Token;
  peek: (i?: number) => Token;
  adv: (i?: number) => Token;
  err: ErrorList;
}

const isEOF = (src: ITokenSource, peek: number = 0): boolean => src.peek(peek) && src.peek(peek).type === TokenType.EOF;

const skipToCloseToken = (src: ITokenSource) => {
  while (!isEOF(src) && !TokenTypeUtil.isCloseDelimiter(src.get().type)) {
    src.adv();
  }
};

type ParseFunc = (src: ITokenSource, ...precedence: ParseNode[]) => ParseNode;

// arr[a,b,c][a,b,c]
// since there is no significant difference between
// array of array of some type and a multi-dimension array of the same type,
// the separation of dimension group will be flatten during the compiling phase
const parseExpressionArray: ParseFunc = (src, id) => {
  const t = src.get();
  if (t.type !== TokenType.DIM_L_BRACKET) {
    return id;
  }
  const dim = parseArrayDimension(src);
  if (dim.children.length === 0) {
    src.err.error(ParserError.expect('Array dimension', t));
    return ParseNode.createArrayAccess(id, dim, id.token);
  }
  if (id.type === ParseNodeType.EXPR_ARR_ACCESS) {
    // flatten array access
    id.children[1].children.push(...dim.children);
    // use recursion here for array of array ...
    return parseExpressionArray(src, id);
  } else {
    // create new array access
    const arrAccess = ParseNode.createArrayAccess(id, dim, id.token);
    // use recursion here for array of array ...
    return parseExpressionArray(src, arrAccess);
  }
};

// func(a,b,c)
const parseExpressionInvoke: ParseFunc = (src, id) => {
  // id is processed, current cursor position ought to be placed at (
  const lParen = src.get();
  const invocation = new ParseNode(ParseNodeType.EXPR_FUNC_INVOKE, id.token);

  if (lParen.type !== TokenType.DIM_L_PAREN) {
    src.err.error(ParserError.expect('(', lParen));
    return invocation;
  }
  src.adv();
  const node = new ParseNode(ParseNodeType.SEG_INVOKE_ARG_LIST, id.token);
  const emptyArgParen = src.get();
  if (emptyArgParen.type === TokenType.DIM_R_PAREN) {
    // empty parameter list
    src.adv();
    invocation.addChild(id);
    invocation.addChild(node);
    return invocation;
  }

  while (true) {
    const exp = parseExpression(src);
    if (exp === null) {
      src.err.error(ParserError.expect('dim expr', src.get()));
    }
    node.addChild(exp);

    const comma = src.get();
    if (comma.type === TokenType.DIM_COMMA) {
      src.adv();
      continue;
    }
    if (comma.type === TokenType.DIM_R_PAREN) {
      src.adv();
      invocation.addChild(id);
      invocation.addChild(node);
      return invocation;
    }
    if (isEOF(src)) {
      src.err.throw(ParserError.error('incomplete function invocation', comma));
    }
    // attempt to ignore current unknown token and continue parsing
    src.err.error(ParserError.expect(') ,', comma));
    src.adv();
  }
};

// i++, i--
const parseExpressionPostUnary: ParseFunc = (src, expr) => {
  const next = src.get();
  if (next.type === TokenType.OP_INC_INC) {
    // increment
    src.adv();
    return ParseNode.createExprUnary(ParseOperatorType.UNI_INC_POS, expr, next);
  }
  if (next.type === TokenType.OP_INC_DEC) {
    // decrement
    src.adv();
    return ParseNode.createExprUnary(ParseOperatorType.UNI_DEC_POS, expr, next);
  }
  return expr;
};

// +a, -a, !a, ++a, --a, a++, a--, + + a, arr[a], a(1), (expr)...
const parseExpressionUnit: ParseFunc = (src) => {
  const handleUnary = (type: ParseOperatorType, t: Token): ParseNode => {
    src.adv();
    const expr = parseExpressionUnit(src);
    return ParseNode.createExprUnary(type, expr, t);
  };

  const t = src.get();
  switch (t.type) {
    case TokenType.VAL_NUM_INT:
      src.adv();
      return ParseNode.createExprConstantInt(t.value, t);
    case TokenType.VAL_NUM_FLOAT:
      src.adv();
      return ParseNode.createExprConstantFloat(t.value, t);
    case TokenType.VAL_BOOL:
      src.adv();
      return ParseNode.createExprConstantBool(t.value, t);
    case TokenType.VAL_CHAR:
      src.adv();
      return ParseNode.createExprConstantChar(t.value, t);
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
      const id = ParseNode.createIdentifier(t.value, t);
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
      return handleUnary(ParseOperatorType.UNI_POSIT, t);
    case TokenType.OP_MINUS:
      return handleUnary(ParseOperatorType.UNI_NEGATE, t);
    case TokenType.OP_LOG_NOT:
      return handleUnary(ParseOperatorType.UNI_NOT, t);
    case TokenType.OP_INC_INC:
      return handleUnary(ParseOperatorType.UNI_INC_PRE, t);
    case TokenType.OP_INC_DEC:
      return handleUnary(ParseOperatorType.UNI_DEC_PRE, t);
    case TokenType.EOF:
      src.err.throw(ParserError.error('incomplete expression', src.get()));
  }
  // unknown node
  src.err.error(ParserError.error('unknown token', src.get()));

  // assume the token is a unintended input token, skip it and attempt this as expression
  src.adv();
  return parseExpressionUnit(src);
};

// helper function for determine operator priority
const parseExpressionWeight =
  (src: ITokenSource, weight: number, leftParam: ParseNode,
   initOp: ParseOperatorType, initOpToken: Token): ParseNode => {
  let leftExpr = leftParam;
  let currentOp = initOp;
  let currentOpToken = initOpToken;
  let currentWeight = getOperatorPriority(initOp) + getOperatorAssociativity(initOp);

  while (true) {
    const expr = parseExpressionUnit(src);

    let t: Token | null = null;
    t = src.get();
    if (isEOF(src) || !TokenTypeUtil.isBinOperator(t.type)) {
      return ParseNode.createExprBinary(currentOp, leftExpr, expr, currentOpToken);
    }
    const op = getBinaryParseOperator(t.type);
    const w = getOperatorPriority(op);
    if (w < weight) {
      return ParseNode.createExprBinary(currentOp, leftExpr, expr, currentOpToken);
    }
    src.adv();
    if (w < currentWeight) {
      leftExpr = ParseNode.createExprBinary(currentOp, leftExpr, expr, currentOpToken);
      currentOp = op;
      currentOpToken = t;
      currentWeight = w + getOperatorAssociativity(op);
    } else {
      const updateExpr = parseExpressionWeight(src, currentWeight, expr, op, t);
      leftExpr = ParseNode.createExprBinary(currentOp, leftExpr, updateExpr, currentOpToken);
      t = src.get();
      if (isEOF(src) || !TokenTypeUtil.isBinOperator(t.type)) {
        return leftExpr;
      }
      currentOp = getBinaryParseOperator(t.type);
      currentOpToken = t;
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

  const t = src.get();
  if (isEOF(src)) {
    src.err.throw(ParserError.error('incomplete expression', t));
  }
  if (!TokenTypeUtil.isBinOperator(t.type)) {
    return expr;
  }
  src.adv();
  return parseExpressionWeight(src, 0, expr, getBinaryParseOperator(t.type), t);
};

// a[,,,]
const parseArrayRefType: ParseFunc = (src, type) => {
  const t = src.get();
  if (t.type !== TokenType.DIM_L_BRACKET) {
    return type || null;
  }
  let dim = 1; // empty brackets is a reference to one dimension array: int[]
  while (true) {
    const comma = src.adv();
    if (comma.type === TokenType.DIM_COMMA) {
      dim++;
      continue;
    }
    if (comma.type === TokenType.DIM_R_BRACKET) {
      src.adv();
      if (type.type === ParseNodeType.TYPE_ARRAY_REF) {
        type.value += dim;
        return parseArrayRefType(src, type);
      } else {
        const arrayRefType = ParseNode.createArrayRefType(type, dim, type.token);
        return parseArrayRefType(src, arrayRefType);
      }
    }
    if (comma.type === TokenType.EOF) {
      src.err.throw(ParserError.expect(', ]', t));
    }

    src.err.error(ParserError.expect(', ]', t));
    if (TokenTypeUtil.isCloseDelimiter(comma.type)) {
      const arrayRefType = ParseNode.createArrayRefType(type, dim, type.token);
      return parseArrayRefType(src, arrayRefType);
    } else {
      src.adv();
    }
  }
};

// [1,2,3]
const parseArrayDimension: ParseFunc = (src) => {
  const lBracket = src.get();
  if (lBracket.type !== TokenType.DIM_L_BRACKET) {
    src.err.error(ParserError.expect('[', lBracket));
  } else {
    src.adv();
  }

  const node = new ParseNode(ParseNodeType.SEG_ARRAY_DIM, lBracket);
  while (true) {
    const exp = parseExpression(src);
    // if (exp === null) {
    //   throw ParserError.expect('dim expr', src.get());
    // }
    node.addChild(exp);

    const comma = src.get();

    if (comma.type === TokenType.DIM_COMMA) {
      src.adv();
      continue;
    }
    if (comma.type === TokenType.DIM_R_BRACKET) {
      src.adv();
      return node;
    }
    if (isEOF(src)) {
      src.err.throw(ParserError.error('incomplete array dimension', comma));
    }
    src.err.error(ParserError.expect('] ,', comma));
    if (TokenTypeUtil.isCloseDelimiter(comma.type)) {
      return node;
    } else {
      src.adv();
    }
  }
};

// int[1,2,3]
const parseArrayType: ParseFunc = (src, type) => {
  const t = src.get();
  if (t.type !== TokenType.DIM_L_BRACKET) {
    return type || null;
  }
  const dim = parseArrayDimension(src);

  if (type.type === ParseNodeType.TYPE_ARRAY) {
    // flatten array type declaration
    type.children[1].children.push(...dim.children);
    return parseArrayType(src, type);
  } else {
    const arrayType = ParseNode.createArrayType(type, dim, type.token);

    // use recursion here for array of array ...
    return parseArrayType(src, arrayType);
  }
};

// int a(int m, int n){}
const parseType: ParseFunc = (src) => {
  let t = src.get();
  // if (!TokenTypeUtil.isType(t.type)) { return null; }
  const primType = ParseNode.createPrimitiveType(t.value as PrimitiveType, t);

  t = src.adv();
  if (t === null || t.type !== TokenType.DIM_L_BRACKET) { return primType; }
  const peek = src.peek(1);
  if (peek !== null && (peek.type === TokenType.DIM_R_BRACKET || peek.type === TokenType.DIM_COMMA)) {
    return parseArrayRefType(src, primType);
  } else {
    return parseArrayType(src, primType);
  }
};

// { stat1; stat2; }
const parseStatementSequence: ParseFunc = (src) => {
  const lCurly = src.get();
  if (lCurly.type !== TokenType.DIM_L_CURLY) {
    src.err.error(ParserError.expect('{', lCurly));
  } else {
    // skip left curly
    src.adv();
  }

  const node = new ParseNode(ParseNodeType.STAT_SEQUENCE, lCurly);
  while (true) {
    const rCurly = src.get();
    if (isEOF(src)) {
      // terminate parsing when EOF found before right curly
      src.err.throw(ParserError.expect('}', rCurly));
    }
    // get paring right curly, close block
    if (rCurly.type === TokenType.DIM_R_CURLY) {
      src.adv();
      return node;
    }
    const child = parseStatement(src);
    node.children.push(child);
  }
};

// return expr;
const parseStatementReturn: ParseFunc = (src) => {
  const ret = src.get();
  if (ret.type !== TokenType.KW_RETURN) {
    src.err.error(ParserError.expect('return', ret));
  } else {
    src.adv();
  }

  const voidExpr = src.get();
  if (voidExpr.type === TokenType.DIM_SEMICOLON) {
    src.adv();
    const node = new ParseNode(ParseNodeType.STAT_RETURN_VOID, voidExpr);
    return node;
  }
  const expr = parseExpression(src);
  const semicolon = src.get();
  if (semicolon.type !== TokenType.DIM_SEMICOLON) {
    src.err.error(ParserError.expect(';', semicolon));
  } else {
    src.adv();
  }

  const node = new ParseNode(ParseNodeType.STAT_RETURN, ret);
  node.addChild(expr);
  return node;
};

// if(condition) {}, if(condition) {} else {}
const parseStatementIf: ParseFunc = (src) => {
  const ifBegin = src.get();
  if (ifBegin.type !== TokenType.KW_IF) {
    src.err.error(ParserError.expect('if', ifBegin));
  } else {
    src.adv();
  }

  const lParen = src.get();
  if (lParen.type !== TokenType.DIM_L_PAREN) {
    src.err.error(ParserError.expect('(', lParen));
  } else {
    src.adv();
  }

  const condition = parseExpression(src);

  const rParen = src.get();
  if (rParen.type !== TokenType.DIM_R_PAREN) {
    src.err.error(ParserError.expect(')', rParen));
  } else {
    src.adv();
  }

  const blockIfTrue = parseStatement(src);
  const elseBegin = src.get();
  if (elseBegin.type !== TokenType.KW_ELSE) {
    // no else clause for this if statement
    const node = new ParseNode(ParseNodeType.STAT_IF, ifBegin);
    node.addChild(condition);
    node.addChild(blockIfTrue);
    return node;
  }

  // skip "else"
  src.adv();
  const blockIfFalse = parseStatement(src);
  const node = new ParseNode(ParseNodeType.STAT_IF_ELSE, elseBegin);
  node.addChild(condition);
  node.addChild(blockIfTrue);
  node.addChild(blockIfFalse);
  return node;
};

// break;
const parseStatementBreak: ParseFunc = (src) => {
  const br = src.get();
  if (br.type !== TokenType.KW_BREAK) {
    src.err.error(ParserError.expect('break', br));
  } else {
    src.adv();
  }

  const semicolon = src.get();
  if (semicolon.type !== TokenType.DIM_SEMICOLON) {
    src.err.error(ParserError.expect(';', semicolon));
  } else {
    src.adv();
  }

  return new ParseNode(ParseNodeType.STAT_BREAK, br);
};

// continue;
const parseStatementContinue: ParseFunc = (src) => {
  const cnt = src.get();
  if (cnt.type !== TokenType.KW_CONTINUE) {
    src.err.error(ParserError.expect('continue', cnt));
  } else {
    src.adv();
  }

  const semicolon = src.get();
  if (semicolon.type !== TokenType.DIM_SEMICOLON) {
    src.err.error(ParserError.expect(';', semicolon));
  } else {
    src.adv();
  }
  return new ParseNode(ParseNodeType.STAT_CONTINUE, cnt);
};

// {case exp: stat; break; default: stat;}
const parseSwitchBody: ParseFunc = (src) => {
  const lCurly = src.get();
  if (lCurly.type !== TokenType.DIM_L_CURLY) {
    src.err.error(ParserError.expect('{', lCurly));
  } else {
    // skip left curly
    src.adv();
  }

  const node = new ParseNode(ParseNodeType.SEG_SWITCH_BODY, lCurly);
  while (true) {
    const next = src.get();

    // get paring right curly, close block
    if (next.type === TokenType.DIM_R_CURLY) {
      src.adv();
      return node;
    }

    // case label
    if (next.type === TokenType.KW_CASE) {
      src.adv();
      const expr = parseExpression(src);

      const colon = src.get();
      if (colon.type !== TokenType.DIM_COLON) {
        src.err.error(ParserError.expect(':', colon));
      } else {
        // skip the colon
        src.adv();
      }

      const caseNode = new ParseNode(ParseNodeType.SEG_CASE_LABEL, next);
      caseNode.addChild(expr);
      node.addChild(caseNode);
      continue;
    }

    // default label
    if (next.type === TokenType.KW_DEFAULT) {
      src.adv();
      const colon = src.get();
      if (colon.type !== TokenType.DIM_COLON) {
        src.err.error(ParserError.expect(':', colon));
      } else {
        // skip the colon
        src.adv();
      }

      node.addChild(new ParseNode(ParseNodeType.SEG_DEFAULT_LABEL, next));
      continue;
    }

    // General statement
    const child = parseStatement(src);
    node.children.push(child);
  }
};

// switch(exp) switchBody
const parseStatementSwitch: ParseFunc = (src) => {
  const switchBegin = src.get();
  if (switchBegin.type !== TokenType.KW_SWITCH) {
    src.err.error(ParserError.expect('switch', switchBegin));
  } else {
    src.adv();
  }

  const lParen = src.get();
  if (lParen.type !== TokenType.DIM_L_PAREN) {
    src.err.error(ParserError.expect('(', lParen));
  } else {
    src.adv();
  }

  const criteria = parseExpression(src);

  const rParen = src.get();
  if (rParen.type !== TokenType.DIM_R_PAREN) {
    src.err.error(ParserError.expect(')', rParen));
  } else {
    src.adv();
  }

  const switchBody = parseSwitchBody(src);
  const node = new ParseNode(ParseNodeType.STAT_SWITCH, switchBegin);
  node.addChild(criteria);
  node.addChild(switchBody);
  return node;
};

// do {} while (exp);
const parseStatementDo: ParseFunc = (src) => {
  const doBegin = src.get();
  if (doBegin.type !== TokenType.KW_DO) {
    src.err.error(ParserError.expect('do', doBegin));
  } else {
    src.adv();
  }

  const loopBlock = parseStatement(src);
  if (loopBlock === null) {
    src.err.error(ParserError.error('the loop block is required', src.get()));
  }
  const whileBegin = src.get();
  if (whileBegin.type !== TokenType.KW_WHILE) {
    src.err.error(ParserError.expect('while', whileBegin));
  } else {
    src.adv();
  }

  const lParen = src.get();
  if (lParen.type !== TokenType.DIM_L_PAREN) {
    src.err.error(ParserError.expect('(', lParen));
  } else {
    src.adv();
  }

  const condition = parseExpression(src);

  const rParen = src.get();
  if (rParen.type !== TokenType.DIM_R_PAREN) {
    src.err.error(ParserError.expect(')', rParen));
  } else {
    src.adv();
  }
  const semicolon = src.get();

  if (semicolon.type !== TokenType.DIM_SEMICOLON) {
    src.err.error(ParserError.expect(';', semicolon));
  } else {
    src.adv();
  }
  const node = new ParseNode(ParseNodeType.STAT_DO, doBegin);
  node.addChild(loopBlock);
  node.addChild(condition);
  return node;
};

// while (expr) {}
const parseStatementWhile: ParseFunc = (src) => {
  const whileBegin = src.get();
  if (whileBegin.type !== TokenType.KW_WHILE) {
    src.err.error(ParserError.expect('while', whileBegin));
  }
  const lParen = src.adv();
  if (lParen.type !== TokenType.DIM_L_PAREN) {
    src.err.error(ParserError.expect('(', lParen));
  } else {
    src.adv();
  }
  const condition = parseExpression(src);
  const rParen = src.get();
  if (rParen.type !== TokenType.DIM_R_PAREN) {
    src.err.error(ParserError.expect(')', rParen));
  } else {
    src.adv();
  }
  const loopBlock = parseStatement(src);
  const node = new ParseNode(ParseNodeType.STAT_WHILE, whileBegin);
  node.addChild(condition);
  node.addChild(loopBlock);
  return node;
};

// (int a, int b, int c)
const parseFunctionParam: ParseFunc = (src) => {
  // TODO: Merge token
  const node = new ParseNode(ParseNodeType.SEG_FUNCTION_PARAM_LIST, src.get());

  const emptyRParen = src.get();
  if (emptyRParen === null || emptyRParen.type === TokenType.DIM_R_PAREN) {
    // empty list (maybe incomplete)
    return node;
  }

  while (true) {
    // get type
    const type = parseType(src);
    if (type === null) {
      src.err.error(ParserError.expect('type', src.get()));
    }

    const id = src.get();
    if (id.type !== TokenType.ID_NAME) {
      src.err.error(ParserError.expect('id', src.get()));
    }
    src.adv();

    const item = new ParseNode(ParseNodeType.SEG_FUNCTION_PARAM_ITEM, id);
    item.addChild(type);
    item.addChild(ParseNode.createIdentifier(id.value, id));
    node.addChild(item);

    const comma = src.get();
    if (comma.type === TokenType.DIM_R_PAREN) {
      return node;
    }

    if (comma.type !== TokenType.DIM_COMMA) {
      src.err.error(ParserError.expect(',', comma));
    }
    src.adv();
  }
};

// int a (Params) {}
const parseFunction: ParseFunc = (src, type, id) => {
  // this requires the type of return value and the identifier of function
  // is provided, current checking point is at the left parenthesis
  if (!type || !id) {
    src.err.throw(ParserError.error('function type and identifer are required', src.get()));
  }

  const lParen = src.get();
  if (lParen.type !== TokenType.DIM_L_PAREN) {
    src.err.error(ParserError.expect('(', lParen));
  } else {
    src.adv();
  }

  const param = parseFunctionParam(src);

  const rParen = src.get();
  if (rParen === null || rParen.type !== TokenType.DIM_R_PAREN) {
    src.err.error(ParserError.expect(')', rParen));
  } else {
    src.adv();
  }

  const body = parseStatementSequence(src);

  const node = new ParseNode(ParseNodeType.STAT_FUNCTION, id.token);
  node.addChild(id);
  node.addChild(type);
  node.addChild(param);
  node.addChild(body);

  return node;
};

// a, a := 10
const parseDeclareItem: ParseFunc = (src, id) => {
  const t = src.get();
  if (t.type === TokenType.DIM_COMMA || t.type === TokenType.DIM_SEMICOLON) {
    return ParseNode.createDeclarationItem(id, undefined, id.token);
  }
  if (t.type === TokenType.OP_ASS_VAL) {
    src.adv();
    const expr = parseExpression(src);
    return ParseNode.createDeclarationItem(id, expr, id.token);
  }
  src.err.error(ParserError.expect(':= , ;', t));
  // skip following tokens till next separating delimiter
  skipToCloseToken(src);
  return ParseNode.createDeclarationItem(id, undefined, id.token);
};

// a, b:= 10, c := a
const parseDeclareList: ParseFunc = (src, firstId) => {
  const declareList: ParseNode[] = [];
  let t = src.get();
  let id: ParseNode | null = firstId;
  while (true) {
    if (!id) {
      if (t.type !== TokenType.ID_NAME) {
        src.err.error(ParserError.expect('identifier', t));
      } else {
        id = ParseNode.createIdentifier(t.value, t);
      }
      t = src.adv();
    }
    if (id) {
      const item = parseDeclareItem(src, id);
      id = null;
      declareList.push(item);
    }
    t = src.get();
    if (t.type !== TokenType.DIM_COMMA && t.type !== TokenType.DIM_SEMICOLON) {
      src.err.error(ParserError.expect(', ;', t));
      skipToCloseToken(src);
    }
    if (isEOF(src)) {
      src.err.throw(ParserError.error('incomplete declare list', src.get()));
    }

    // skip ', ;'
    src.adv();

    if (t.type === TokenType.DIM_SEMICOLON) {
      return ParseNode.createDeclarationList(declareList, t);
    }

    t = src.get();
  }
};

// int declarationList; int[arr] a;
const parseStatementDeclaration: ParseFunc = (src) => {
  let t = src.get();
  // if (!t || !TokenTypeUtil.isType(t.type)) { return null; }
  const type = parseType(src);

  // identifier
  t = src.get();
  if (t.type !== TokenType.ID_NAME) {
    throw ParserError.expect('identifier', t);
  }
  src.adv(); // move after identifier
  const id = ParseNode.createIdentifier(t.value, t);

  t = src.get();
  if (![
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
    } else if (t.type === TokenType.DIM_COMMA) {
      src.err.error(ParserError.error('array declaration can only specify on variable', t));
      while (src.adv().type !== TokenType.DIM_SEMICOLON && !isEOF(src)) { /* nothing */ }
    } else if (t.type === TokenType.OP_ASS_VAL) {
      src.err.error(ParserError.error('array declaration cannot assign value', t));
      while (src.adv().type !== TokenType.DIM_SEMICOLON && !isEOF(src)) { /* nothing */ }
    }
    return ParseNode.createDeclarationArray(type, id, type.token);
  } else if (type.type === ParseNodeType.TYPE_ARRAY_REF) {
    if ([TokenType.OP_ASS_VAL, TokenType.DIM_COMMA, TokenType.DIM_SEMICOLON].includes(t.type)) {
      const list = parseDeclareList(src, id);
      return ParseNode.createDeclarationArrayRef(type, list, type.token);
    }
  } else if (type.type === ParseNodeType.TYPE_PRIMITIVE) {
    if ([TokenType.OP_ASS_VAL, TokenType.DIM_COMMA, TokenType.DIM_SEMICOLON].includes(t.type)) {
      const list = parseDeclareList(src, id);
      return ParseNode.createDeclarationPrimitive(type, list, type.token);
    }
  }
  throw ParserError.error('', t);
};

// expression or declaration
const parseStatementExprDecl: ParseFunc = (src) => {
  const t = src.get();
  // if (!t) { return null; }

  if (TokenTypeUtil.isType(t.type)) {
    return parseStatementDeclaration(src);
  }
  const expr = parseExpression(src);
  const end = src.get();
  if (end.type !== TokenType.DIM_SEMICOLON) {
    src.err.error(ParserError.expect(';', end));
  } else {
    src.adv();
  }
  const exprStat = new ParseNode(ParseNodeType.STAT_EXPR, t);
  exprStat.addChild(expr);
  return exprStat;
};

// statement
const parseStatement: ParseFunc = (src) => {
  const t = src.get();
  if (isEOF(src)) {
    src.err.throw(ParserError.expect('statement', t));
  }
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
  const node = new ParseNode(ParseNodeType.SRC_SOURCE, src.get());
  while (!isEOF(src)) {
    const child = parseStatement(src);
    if (child) {
      node.children.push(child);
    } else {
      src.err.error(ParserError.error('cannot parse token', src.get()));
      // skip unrecognized token to prevent infinite loop
      if (isEOF(src)) {
        break;
      }
      src.adv();
    }
  }
  return node;
};

export const parser = (tokensWithWhiteSpace: Token[]): IParserResult => {
  let tokenIndex = 0;
  const tokens = tokensWithWhiteSpace.filter((tk) => !TokenTypeUtil.isWhiteSpace(tk.type));
  const errList: ErrorList = new ErrorList();
  const tokenSource: ITokenSource = {
    get: () => tokens[tokenIndex],
    peek: (i: number = 1) => tokens[tokenIndex + i],
    adv: (i: number = 1) => tokens[tokenIndex += i],
    err: errList,
  };

  // The root/initial is a source file
  let ast: ParseNode | null = null;
  try {
    ast = parseSource(tokenSource);
  } catch (e) {
    const parserErr = e as PicolError;
    if (parserErr.name !== errorName.parser) {
      // unexpected error, throw it again
      throw e;
    }

    if (e !== errList.errorList[errList.errorList.length - 1]) {
      errList.fatal(e);
    }
  }
  return {
    errorList: errList.errorList,
    ast,
  };
};
