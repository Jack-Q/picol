import { Token, TokenType } from './token';

interface ILexerOption {
  reserveWhiteSpace: boolean;
}

const defaultOption: ILexerOption = {
  reserveWhiteSpace: false,
};

const util = {
  isNewLine: (ch: string): boolean => ['\n', '\r'].indexOf(ch) >= 0,
};

export const lexer = function*(source: string, option: ILexerOption = defaultOption) {
  const len = source.length;
  let pos = -1, line = 1, col = 0;

  const adv = (): string => {
    pos++;
    if (pos === len) {return ''; }
    if (util.isNewLine(source[pos])) {
      line++; col = 1;
    } else {
      col++;
    }
    return source[pos];
  };

  const peek = (i: number): string => source[pos + i];

  while (pos < len) {
    const ch = adv();
    if (ch.length) {
      yield new Token(TokenType.SP_WHITE, ch, line, col, pos);
    }
  }
};
