/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />

interface IPicolMonarchLanguage extends monaco.languages.IMonarchLanguage {
  keywords: string[];
  typeKeywords: string[];
  operators: string[];
  symbols: RegExp;
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
    'case',
    'default',
  ],
  symbols: /\+\+|--|\+=|-=|\+|-|:=|:|>=|>|<=|<|==|!=|!|&&|\|\||\*=|\/=|\*|\//,
  operators: [
    ':',
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
  ],
  typeKeywords: [
    'bool', 'int', 'char', 'void', 'float',
  ],
  brackets: [
    ['{', '}', 'delimiter.curly'],
    ['(', ')', 'delimiter.parenthesis'],
    ['[', ']', 'delimiter.square'],
  ].map((i) => ({ open: i[0], close: i[1], token: i[2]})),

  tokenizer: {
    root: [
      // Rules for token identification
      [/[a-zA-Z$_]\w*/, {
        cases: {
          '@typeKeywords': 'type',
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],
      [/'(?:\\["'\\tnr]|[^\\'])'/, 'string'], // char
      [/'(?:\\'|[^'])*'/, 'error'], // char with multiple entries
      [/'(?:\\'|[^'])*/, 'error'], // unclosed char sequence cannot across multiple lines

      [/"(?:\\"|[^\\"])*"/, 'error'], // string is not supported
      [/"(?:\\"|[^\\"])*/, 'error'], // string cannot across multiple lines

      [/(?:0|(?:[1-9]\d*))\.\d+/, 'number'], // float number
      [/0|(?:[1-9]\d*)/, 'number'], // integer

      [/[{}()\[\]]/, '@brackets'],

      [/\/\/(.*)$/, { token: 'comment'}],
      [/[;,]/, 'delimiter'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
        },
      }],
      [/[ \t]+/, 'whitespace'],
      [/./, { token: 'invalid' }],
    ],
  },
  tokenPostfix: '',
};

export default picolLanguage;
