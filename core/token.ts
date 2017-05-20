export enum TokenType {
  SP_WHITE,
  SP_COMMENT_LINE,
  KW_WHILE,
  KW_DO,
  KW_SWITCH,
  KW_CASE,
  KW_RETURN,
  KW_IF,
  KW_ELSE,
  KW_DEFAULT,
  OP_BINARY, // +, -, *, /, >, >=, <, <=, =, !=, &&, ||
  OP_ASSIGN, // :=, += , -= , *=, /=
  OP_INC_DEC, // ++, --
  OP_LEFT_UNARY, // !
  VAL_BOOL, // true, false
  VAL_CHAR,
  VAL_NUMBER_FLOAT,
  VAL_NUMBER_INT,
}

export class Token {
  public type: TokenType;
  public literal: string;
  public line: number;
  public pos: number;
  public col: number;

  constructor(type: TokenType, literal: string, line: number, col: number, pos: number) {
    this.type = type;
    this.literal = literal;
    this.line = line;
    this.col = col;
    this.pos = pos;
  }
}
