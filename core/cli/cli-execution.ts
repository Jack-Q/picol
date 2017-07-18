import { IExecutionParameterProvider } from '../main';

// TODO: use `readline-sync` as provider for parameters
const cliExecutionProvider: IExecutionParameterProvider = {
  getInteger: () => new Promise((res, rej) => res(1024)),
  getBoolean: () => new Promise((res, rej) => res(true)),
  getChar: () => new Promise((res, rej) => res('c')),
  getFloat: () => new Promise((res, rej) => res(Math.PI)),
};
