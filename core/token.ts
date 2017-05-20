export interface IPosition { pos: number; line: number; col: number; }

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
  KW_CONTINUE,
  KW_BREAK,
  ID_NAME,
  OP_BINARY, // +, -, *, /, >, >=, <, <=, =, !=, &&, ||
  OP_ASSIGN, // :=, += , -= , *=, /=
  OP_INC_DEC, // ++, --
  OP_LEFT_UNARY, // !
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

export class Token {
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
}

export const operators = [
  '+', '-', '*', '/',
  '>', '>=', '<', '<=', '==', '!=',
  '&&', '||',
  ':=', '+=', '-=', '*=', '/=',
  '++', '--',
];

// tslint:disable-next-line:max-classes-per-file
export class OperatorToken extends Token {
  constructor(literal: string, position: IPosition) {
    super(TokenType.OP_BINARY, literal, position);
  }
}
