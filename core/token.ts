export interface IPosition { pos: number; line: number; col: number; }

export enum TokenType {
  SP_WHITE,
  SP_COMMENT_LN,

  KW_WHILE,
  KW_DO,
  KW_SWITCH,
  KW_CASE,
  KW_RETURN,
  KW_IF,
  KW_ELSE,
  KW_DEFAULT,
  KW_CONTINUE,
  KW_BREAK,

  ID_NAME,
  ID_TYPE,

  OP_PLUS,
  OP_MINUS,
  OP_MULTI,
  OP_DIVIDE,
  OP_REL_GT,
  OP_REL_GTE,
  OP_REL_EQ,
  OP_REL_NE,
  OP_REL_LT,
  OP_REL_LTE,
  OP_LOG_AND,
  OP_LOR_OR,
  OP_LOG_NOT,
  OP_ASS_VAL,
  OP_ASS_ADD,
  OP_ASS_SUB,
  OP_ASS_MUL,
  OP_ASS_DIV,
  OP_INC_INC,
  OP_INC_DEC,

  DIM_L_BRACKET, // [
  DIM_R_BRACKET, // ]
  DIM_L_PAREN, // (
  DIM_R_PAREN, // )
  DIM_L_CURLY, // {
  DIM_R_CURLY, // }
  DIM_SEMICOLON, // ;
  DIM_COMMA, // ,

  VAL_BOOL, // true, false
  VAL_CHAR,
  VAL_NUM_FLOAT,
  VAL_NUM_INT,

  INV_VALUE, // invalid value for some val type
  INV_NO_MATCH, // invalid token
}

export const TokenTypeUtil = {
  isWhiteSpace: (t: TokenType | null): boolean =>
    t !== null && [TokenType.SP_WHITE, TokenType.SP_COMMENT_LN].includes(t),
  isType: (t: TokenType | null): boolean =>
    t !== null && [TokenType.ID_TYPE].includes(t),
};

export enum PrimitiveType {
  INT, FLOAT, CHAR, BOOL,
}

const OperatorMap: {[op: string]: TokenType} = {
  '+': TokenType.OP_PLUS,
  '-': TokenType.OP_MINUS,
  '*': TokenType.OP_MULTI,
  '/': TokenType.OP_DIVIDE,
  '>': TokenType.OP_REL_GT,
  '>=': TokenType.OP_REL_GTE,
  '=': TokenType.OP_REL_EQ,
  '!=': TokenType.OP_REL_NE,
  '<': TokenType.OP_REL_LT,
  '<=': TokenType.OP_REL_LTE,
  '&&': TokenType.OP_LOG_AND,
  '||': TokenType.OP_LOR_OR,
  '!': TokenType.OP_LOG_NOT,
  ':=': TokenType.OP_ASS_VAL,
  '+=': TokenType.OP_ASS_ADD,
  '-=': TokenType.OP_ASS_SUB,
  '*=': TokenType.OP_ASS_MUL,
  '/=': TokenType.OP_ASS_DIV,
  '++': TokenType.OP_INC_INC,
  '--': TokenType.OP_INC_DEC,
};

const KeywordMap: { [op: string]: TokenType } = {
  // keywords
  while: TokenType.KW_WHILE,
  do: TokenType.KW_DO,
  switch: TokenType.KW_SWITCH,
  case: TokenType.KW_CASE,
  return: TokenType.KW_RETURN,
  if: TokenType.KW_IF,
  else: TokenType.KW_ELSE,
  default: TokenType.KW_DEFAULT,
  continue: TokenType.KW_CONTINUE,
  break: TokenType.KW_BREAK,
};

export class Token {
  public static createOperatorToken(literal: string, position: IPosition): Token|null {
    if (OperatorMap[literal]) {
      return new Token(OperatorMap[literal], literal, position);
    }
    return null;
  }
  public static createIdentifierToken(literal: string, position: IPosition): Token {
    const newToken = (type: TokenType, val?: any) => new Token(type, literal, position, val);
    if (KeywordMap[literal]) {
      return newToken(KeywordMap[literal]);
    }
    switch (literal) {
      case 'true': return newToken(TokenType.VAL_BOOL, true);
      case 'false': return newToken(TokenType.VAL_BOOL, false);
      case 'int': return newToken(TokenType.ID_TYPE, PrimitiveType.INT);
      case 'float': return newToken(TokenType.ID_TYPE, PrimitiveType.FLOAT);
      case 'char': return newToken(TokenType.ID_TYPE, PrimitiveType.CHAR);
      case 'bool': return newToken(TokenType.ID_TYPE, PrimitiveType.BOOL);
    }
    return newToken(TokenType.ID_NAME);
  }

  public type: TokenType;
  public literal: string;
  public position: IPosition;
  public value: any;

  constructor(type: TokenType, literal: string, position: IPosition, value?: any) {
    this.type = type;
    this.literal = literal;
    this.position = { ...position };
    this.value = value;
  }

  public getPositionString = (): string => `ln: ${this.position.line}, col: ${this.position.col}`;

}
