import { IPosition, Token, TokenType } from './token';

export class LexerError extends Error {
  public pos: IPosition;
  constructor(message: string, pos: IPosition) {
    super(message);
    this.name = 'LexerError';
    this.pos = { ...pos };
  }
}

export interface ILexerOption {
  reserveWhiteSpace: boolean;
}

const defaultOption: ILexerOption = {
  reserveWhiteSpace: false,
};

type Peek = (i?: number) => string;
type CharPredicate = (ch: string) => boolean;

const util = {
  isNewLine: ((ch) => '\n\r'.indexOf(ch) >= 0) as CharPredicate,
  isWhiteSpace: ((ch) => ' \t\n\r'.indexOf(ch) >= 0) as CharPredicate,
  isIdentifierStart: ((ch) => /[A-Za-z_\$]/.test(ch)) as CharPredicate,
  isIdentifierMid: ((ch) => /[A-Za-z_\$0-9]/.test(ch)) as CharPredicate,
  isDigit: ((ch) => /\d/.test(ch)) as CharPredicate,

  peekIf: (peek: Peek, predicate: CharPredicate, limit: number = Infinity, stopLineEnd: boolean = true): string => {
    for (let i = 0, str = ''; ; i++) {
      const ch = peek(i);
      if (!predicate(ch) || (stopLineEnd && util.isNewLine(ch))) {
        return str;
      }
      if (i >= limit) {
        break;
      }
      str += ch;
    }
    return '';
  },
};

const matchers:
  Array<(ch: string, adv: (i?: number) => string, peek: Peek,
         getPos: () => IPosition) => Token | null> = [
  // Match white space
  (ch, adv, peek, getPos) => {
    if (util.isWhiteSpace(ch)) {
      const literal = util.peekIf(peek, util.isWhiteSpace, Infinity, false);
      const initPos = { ...getPos() };
      adv(literal.length - 1);
      return new Token(TokenType.SP_WHITE, literal, initPos);
    }
    return null;
  },
  // Match line comment
  (ch, adv, peek, getPos) => {
    if (ch === '/' && peek() === '/') {
      const literal = util.peekIf(peek, () => true);
      const initPos = { ...getPos() };
      adv(literal.length - 1 + 1); // 1 more advance to skip the new line
      return new Token(TokenType.SP_COMMENT_LN, literal, initPos);
    } else {
      return null;
    }
  },
  // Match identifier, keyword, build-in type
  (ch, adv, peek, getPos) => {
    if (util.isIdentifierStart(ch)) {
      const literal = util.peekIf(peek, util.isIdentifierMid);
      const initPos = { ...getPos() };
      adv(literal.length - 1);
      return Token.createIdentifierToken(literal, initPos);
    }
    return null;
  },
  // Match operator
  (ch, adv, peek, getPos) => {
    const operatorSymbols = '+-*/<>=:&|~!';
    const initPos = { ...getPos() };
    if (operatorSymbols.indexOf(ch) >= 0) {
      if (operatorSymbols.indexOf(peek()) >= 0) {
        const op = Token.createOperatorToken(ch + peek(), initPos);
        if (op) {
          adv(1);
          return op;
        }
      }
      const op = Token.createOperatorToken(ch, initPos);
      if (op) { return op; }
    }
    return null;
  },
  // Match delimiter
  (ch, adv, peek, getPos) => {
    switch (ch) {
      case ';': return new Token(TokenType.DIM_SEMICOLON, ';', getPos());
      case ',': return new Token(TokenType.DIM_COMMA, ',', getPos());
      case ':': return new Token(TokenType.DIM_COLON, ':', getPos());
      case '(': return new Token(TokenType.DIM_L_PAREN, '(', getPos());
      case ')': return new Token(TokenType.DIM_R_PAREN, ')', getPos());
      case '{': return new Token(TokenType.DIM_L_CURLY, '{', getPos());
      case '}': return new Token(TokenType.DIM_R_CURLY, '}', getPos());
      case '[': return new Token(TokenType.DIM_L_BRACKET, '[', getPos());
      case ']': return new Token(TokenType.DIM_R_BRACKET, ']', getPos());
    }
    return null;
  },
  // Match number
  (ch, adv, peek, getPos) => {
    if (util.isDigit(ch)) {
      let pos = 1, isFloat = false, val = parseInt(ch, 10), lit = ch, floatWeight = 0.1;
      const initPos = { ...getPos() };
      while (true) {
        ch = peek(pos);
        if (util.isDigit(ch)) {
          if (isFloat) {
            val += floatWeight * parseInt(ch, 10);
            floatWeight /= 10;
          } else {
            val = val * 10 + parseInt(ch, 10);
          }
        } else if (!isFloat && ch === '.') {
          isFloat = true;
        } else {
          break;
        }
        pos++;
        lit += ch;
      }
      adv(pos - 1);
      return new Token(
        isFloat ? TokenType.VAL_NUM_FLOAT : TokenType.VAL_NUM_INT,
        lit, initPos, val);
    }
    return null;
  },
  // Match char / string
  (ch, adv, peek, getPos) => {
    const escape = '\\tnr\'"';
    if (ch === '\'' || ch === '"') {
      let pos = 1, lit = ch, val = '', invalid = null;
      const initPos = { ...getPos() }, open = ch;
      while (true) {
        ch = peek(pos++);
        lit += ch;
        if (ch === '\\') {
          // escape char, other escape sequence are keep its original form
          const index = escape.indexOf(peek(pos + 1));
          if ( index >= 0) {
            ch = peek(pos++);
            lit += ch;
            val += escape[index];
          }
        } else if (ch === open) {
          break;
        } else if (util.isNewLine(ch)) {
          invalid = 'require close quote';
          break;
        } else {
          val += ch;
        }
      }
      adv(pos - 1);

      invalid = invalid || (val.length > 1 && 'only char (not string) supported');
      invalid = invalid || (val.length === 0 && 'char cannot be empty');
      invalid = invalid || (open === '"' && 'char should be quoted by \'');

      if (invalid) {
        return new Token(TokenType.INV_VALUE, lit, initPos, invalid);
      }
      return new Token(TokenType.VAL_CHAR, lit, initPos, val);
    }
    return null;
  },
];

export const lexer = function*(source: string, option: ILexerOption = defaultOption) {
  const len = source.length;
  const pos: IPosition = { pos: -1, line: 0, col: 1 };

  const adv = (i: number = 1): string => {
    while (i > 0 && i--) {
      pos.pos++;
      if (pos.pos === len) {return ''; }
      if (pos.pos === 0 || util.isNewLine(source[pos.pos - 1])) {
        pos.line++; pos.col = 1;
      } else {
        pos.col++;
      }
    }
    return source[pos.pos];
  };

  const peek: Peek = (i = 1) => source[pos.pos + i];
  const getPos = () => pos;

  ctrl: while (pos.pos < len) {
    const ch = adv();
    if (ch.length) {
      for (const matcher of matchers) {
        const token = matcher(ch, adv, peek, getPos);
        if (token) {
          yield token;
          continue ctrl;
        }
      }
      yield new Token(TokenType.INV_NO_MATCH, ch, pos, `invalid token '${ch}'`);
      // throw new LexerError(`invalid token '${ch}'`, pos);
    }
  }
};
