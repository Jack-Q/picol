/// <reference path="../../node_modules/monaco-editor/monaco.d.ts" />

interface IPicolMonarchLanguage extends monaco.languages.IMonarchLanguage {
  keywords: string[];
  typeKeywords: string[];
  operators: string[];
}

const picolLanguage: IPicolMonarchLanguage = {

    defaultToken: 'invalid',
    keywords: [
      'continue',
      'switch',
      'do',
      'if',
      'break',
      'else',
      'return',
      'while',
      'true',
      'false',
    ],
    operators: [
      ':=',
      '>',
      '<',
      '!',
      '~',
      '==',
      '<=',
      '>=',
      '!=',
      '&&',
      '||',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '+=',
      '-=',
      '*=',
      '/=',
      '&=',
      '|=',
      '^=',
      '%=',
      '<<=',
      '>>=',
      '>>>=',
    ],
    typeKeywords: [
      'bool', 'int', 'char', 'void', 'float',
    ],

    tokenizer: {
      root: [
        // Rules for token identification
        [/\/\/(.*)$/, { token: 'comment', log: 'Line Comment $1' }],
        [/./, { token: 'invalid', log: 'Invalid item found $0' }],
      ],
    },
    tokenPostfix: '',
};

export default picolLanguage;
