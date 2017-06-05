import { IPosition, Token } from './token';

export enum ErrorSeverity {
  INFO, WARN, ERROR, FATAL,
}

export class PicolError extends Error {
  public token: Token | undefined;
  public pos: IPosition | undefined;
  public severity: ErrorSeverity = ErrorSeverity.ERROR;
  constructor(message: string) {
    super(message);
    this.name = 'PicolError';
  }
}

export class LexerError extends PicolError {
  constructor(message: string, pos: IPosition) {
    super(message);
    this.name = 'LexerError';
    this.pos = { ...pos };
  }
}

export class ParserError extends PicolError {
  public static expect = (e: string, t: Token | null): ParserError =>
    new ParserError(`expecting "${e}" at ${t !== null ? t.getPositionString() : 'the end'}`, t || undefined)
  public static error = (e: string, t: Token | null): ParserError =>
    new ParserError(`${e}, error at ${t !== null ? t.getPositionString() : 'the end'}`, t || undefined)

  private constructor(message: string, token?: Token) {
    super(message);
    this.token = token;
    this.name = 'ParserError';
  }
}

export class GeneratorError extends PicolError {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

export class ErrorList {
  public errorList: PicolError[] = [];
  public info(err: PicolError) {
    err.severity = ErrorSeverity.INFO;
    this.errorList.push(err);
  }
  public warn(err: PicolError) {
    err.severity = ErrorSeverity.WARN;
    this.errorList.push(err);
  }
  public error(err: PicolError) {
    err.severity = ErrorSeverity.ERROR;
    this.errorList.push(err);
  }
  public throw(err: PicolError) {
    err.severity = ErrorSeverity.FATAL;
    this.errorList.push(err);
    // store and interrupt current process
    throw err;
  }
}
