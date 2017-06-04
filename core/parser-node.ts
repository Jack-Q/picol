import { PrimitiveType, TokenType } from './token';

export enum ParseOperatorType {
  NO_OP,       // invalid

  UNI_POSIT,    // + a
  UNI_NOT,     // ! a
  UNI_NEGATE,   // - a
  UNI_INC_PRE, // ++ a
  UNI_DEC_PRE, // -- a
  UNI_INC_POS, // a ++
  UNI_DEC_POS, // a --

  BIN_ADD,     // a + b
  BIN_SUB,     // a - b
  BIN_MULTI,   // a * b
  BIN_DIVIDE,  // a / b
  BIN_REL_GT,  // a > b
  BIN_REL_GTE, // a >= b
  BIN_REL_EQ,  // a = b
  BIN_REL_NE,  // a != b
  BIN_REL_LT,  // a < b
  BIN_REL_LTE, // a <= b
  BIN_LOG_AND, // a && b
  BIN_LOG_OR,  // a || b
  BIN_ASS_VAL, // a := b
  BIN_ASS_ADD, // a += b
  BIN_ASS_SUB, // a -= b
  BIN_ASS_MUL, // a *= b
  BIN_ASS_DIV, // a /= b
}

export const getOperatorPriority = (op: ParseOperatorType) => {
  switch (op) {
    case ParseOperatorType.BIN_ASS_VAL:
    case ParseOperatorType.BIN_ASS_ADD:
    case ParseOperatorType.BIN_ASS_SUB:
    case ParseOperatorType.BIN_ASS_MUL:
    case ParseOperatorType.BIN_ASS_DIV:
      return 1;
    case ParseOperatorType.BIN_LOG_OR:
      return 2;
    case ParseOperatorType.BIN_LOG_AND:
      return 3;
    case ParseOperatorType.BIN_REL_EQ:
    case ParseOperatorType.BIN_REL_NE:
      return 4;
    case ParseOperatorType.BIN_REL_GT:
    case ParseOperatorType.BIN_REL_GTE:
    case ParseOperatorType.BIN_REL_LT:
    case ParseOperatorType.BIN_REL_LTE:
      return 5;
    case ParseOperatorType.BIN_ADD:
    case ParseOperatorType.BIN_SUB:
      return 6;
    case ParseOperatorType.BIN_DIVIDE:
    case ParseOperatorType.BIN_MULTI:
      return 7;
  }
  return 0;
};

export const getOperatorAssociativity = (op: ParseOperatorType) => {
  switch (op) {
    case ParseOperatorType.BIN_ASS_VAL:
    case ParseOperatorType.BIN_ASS_ADD:
    case ParseOperatorType.BIN_ASS_SUB:
    case ParseOperatorType.BIN_ASS_MUL:
    case ParseOperatorType.BIN_ASS_DIV:
      return -0.5;
    case ParseOperatorType.BIN_LOG_OR:
    case ParseOperatorType.BIN_LOG_AND:
    case ParseOperatorType.BIN_REL_EQ:
    case ParseOperatorType.BIN_REL_NE:
    case ParseOperatorType.BIN_REL_GT:
    case ParseOperatorType.BIN_REL_GTE:
    case ParseOperatorType.BIN_REL_LT:
    case ParseOperatorType.BIN_REL_LTE:
    case ParseOperatorType.BIN_ADD:
    case ParseOperatorType.BIN_SUB:
    case ParseOperatorType.BIN_DIVIDE:
    case ParseOperatorType.BIN_MULTI:
      return 0.5;
  }
  return 0;
};

export const getBinaryParseOperator = (op: TokenType): ParseOperatorType => {
  switch (op) {
    case TokenType.OP_PLUS: return ParseOperatorType.BIN_ADD;
    case TokenType.OP_MINUS: return ParseOperatorType.BIN_SUB;
    case TokenType.OP_MULTI: return ParseOperatorType.BIN_MULTI;
    case TokenType.OP_DIVIDE: return ParseOperatorType.BIN_DIVIDE;
    case TokenType.OP_REL_GT: return ParseOperatorType.BIN_REL_GT;
    case TokenType.OP_REL_GTE: return ParseOperatorType.BIN_REL_GTE;
    case TokenType.OP_REL_EQ: return ParseOperatorType.BIN_REL_EQ;
    case TokenType.OP_REL_NE: return ParseOperatorType.BIN_REL_NE;
    case TokenType.OP_REL_LT: return ParseOperatorType.BIN_REL_LT;
    case TokenType.OP_REL_LTE: return ParseOperatorType.BIN_REL_LTE;
    case TokenType.OP_LOG_AND: return ParseOperatorType.BIN_LOG_AND;
    case TokenType.OP_LOG_OR: return ParseOperatorType.BIN_LOG_OR;
    case TokenType.OP_ASS_VAL: return ParseOperatorType.BIN_ASS_VAL;
    case TokenType.OP_ASS_ADD: return ParseOperatorType.BIN_ASS_ADD;
    case TokenType.OP_ASS_SUB: return ParseOperatorType.BIN_ASS_SUB;
    case TokenType.OP_ASS_MUL: return ParseOperatorType.BIN_ASS_MUL;
    case TokenType.OP_ASS_DIV: return ParseOperatorType.BIN_ASS_DIV;
  }
  return ParseOperatorType.NO_OP;
};

export enum ParseNodeType {
  SRC_SOURCE,

  STAT_DECLARATION_PRIM,
  STAT_DECLARATION_ARR,
  STAT_SEQUENCE,
  STAT_RETURN,
  STAT_RETURN_VOID,
  STAT_BREAK,
  STAT_CONTINUE,
  STAT_IF,
  STAT_IF_ELSE,
  STAT_WHILE,
  STAT_DO,
  STAT_SWITCH,
  STAT_FUNCTION,
  STAT_EXPR,

  SEG_DECLARATION_LIST,
  SEG_DECLARATION_ITEM,
  SEG_SWITCH_BODY,
  SEG_CASE_LABEL,
  SEG_DEFAULT_LABEL,
  SEG_FUNCTION_PARAM_ITEM,
  SEG_FUNCTION_PARAM_LIST,
  SEG_INVOKE_ARG_LIST,
  SEG_ARRAY_DIM,

  TYPE_ARRAY,
  TYPE_PRIMITIVE,

  EXPR_UNI,
  EXPR_BIN,
  EXPR_ARR_ACCESS,
  EXPR_FUNC_INVOKE,

  VAL_CONSTANT_INT,
  VAL_CONSTANT_FLOAT,
  VAL_CONSTANT_CHAR,
  VAL_CONSTANT_BOOL,
  VAL_IDENTIFIER,
  VAL_UNINITIALIZED, // uninitialized value for declaration
}

export class ParseNode {
  public static createIdentifier(identifier: string) {
    return new ParseNode(ParseNodeType.VAL_IDENTIFIER, identifier);
  }

  public static createDeclarationPrimitive(declareType: ParseNode, declareList: ParseNode) {
    const node = new ParseNode(ParseNodeType.STAT_DECLARATION_PRIM);
    node.addChild(declareType);
    node.addChild(declareList);
    return node;
  }

  public static createDeclarationArray(declareType: ParseNode, identifier: ParseNode) {
    const node = new ParseNode(ParseNodeType.STAT_DECLARATION_ARR);
    node.addChild(declareType);
    node.addChild(identifier);
    return node;
  }

  public static createDeclarationList(declareItems: ParseNode[]) {
    const node = new ParseNode(ParseNodeType.SEG_DECLARATION_LIST);
    declareItems.map((i) => node.addChild(i));
    return node;
  }

  public static createDeclarationItem(identifier: ParseNode, expression?: ParseNode) {
    const node = new ParseNode(ParseNodeType.SEG_DECLARATION_ITEM);
    if (!expression) {
      expression = new ParseNode(ParseNodeType.VAL_UNINITIALIZED);
    }
    node.addChild(identifier);
    node.addChild(expression);
    return node;
  }

  public static createPrimitiveType(type: PrimitiveType) {
    return new ParseNode(ParseNodeType.TYPE_PRIMITIVE, type);
  }

  public static createArrayType(elementType: ParseNode, dimension: ParseNode) {
    const node = new ParseNode(ParseNodeType.TYPE_ARRAY);
    node.addChild(elementType);
    node.addChild(dimension);
    return node;
  }
  public static createArrayAccess(id: ParseNode, dimension: ParseNode) {
    const node = new ParseNode(ParseNodeType.EXPR_ARR_ACCESS);
    node.addChild(id);
    node.addChild(dimension);
    return node;
  }

  public static createExprConstantInt(value: number) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_INT, value);
  }
  public static createExprConstantFloat(value: number) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_FLOAT, value);
  }
  public static createExprConstantBool(value: boolean) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_BOOL, value);
  }
  public static createExprConstantChar(value: string) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_CHAR, value);
  }

  public static createExprUnary(op: ParseOperatorType, expr: ParseNode) {
    const node = new ParseNode(ParseNodeType.EXPR_UNI, op);
    node.addChild(expr);
    return node;
  }
  public static createExprBinary(op: ParseOperatorType, exprLeft: ParseNode, exprRight: ParseNode) {
    const node = new ParseNode(ParseNodeType.EXPR_BIN, op);
    node.addChild(exprLeft);
    node.addChild(exprRight);
    return node;
  }

  public type: ParseNodeType;
  public value: any;
  public children: ParseNode[] = [];

  constructor(type: ParseNodeType, value?: any) {
    this.type = type;
    this.value = value;
  }

  public print = (indent: number = 2, depth: number = 0) => {
    console.log(`${
      ' '.repeat(indent * depth)}${ParseNodeType[this.type]
      }   \x1b[1;35m${this.getValueString()}\x1b[0m`);
    this.children.map((c) => c.print(indent, depth + 1));
  }

  public getValueString = (): string => {
    switch (this.type) {
      case ParseNodeType.EXPR_UNI:
      case ParseNodeType.EXPR_BIN:
        return ParseOperatorType[this.value];
      case ParseNodeType.TYPE_PRIMITIVE: return PrimitiveType[this.value];
      case ParseNodeType.VAL_UNINITIALIZED: return 'no initialization';
    }
    return this.value === undefined ? '' : this.value;
  }

  public addChild = (child: ParseNode | null): boolean => {
    if (child) { this.children.push(child); }
    return !!child;
  }
}
