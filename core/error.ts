import { IPosition, Token } from './token';

export class LexerError extends Error {
  public pos: IPosition;
  constructor(message: string, pos: IPosition) {
    super(message);
    this.name = 'LexerError';
    this.pos = { ...pos };
  }
}

export class ParserError extends Error {
  public static expect = (e: string, t: Token | null): ParserError =>
    new ParserError(`expecting "${e}" at ${t !== null ? t.getPositionString() : 'the end'}`, t)
  public static error = (e: string, t: Token | null): ParserError =>
    new ParserError(`${e}, error at ${t !== null ? t.getPositionString() : 'the end'}`, t)

  public token: Token | null;
  private constructor(message: string, token: Token | null) {
    super(message);
    this.token = token;
    this.name = 'ParserError';
  }
}

export class GeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}
