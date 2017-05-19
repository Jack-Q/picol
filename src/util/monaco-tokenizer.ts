/// <reference path="../../node_modules/monaco-editor/monaco.d.ts" />

interface PicolMonarchLanguage extends monaco.languages.IMonarchLanguage {
  keywords: string[],
  typeKeywords: string[],
  operators: string[],
}

const picolLanguage: PicolMonarchLanguage = {

    defaultToken: 'invalid',
    keywords: [
      'continue',
      'for',
      'new',
      'switch',
      'assert',
      'goto',
      'do',
      'if',
      'private',
      'this',
      'break',
      'protected',
      'throw',
      'else',
      'public',
      'enum',
      'return',
      'catch',
      'try',
      'interface',
      'static',
      'class',
      'finally',
      'const',
      'super',
      'while',
      'true',
      'false',
    ],
    typeKeywords: [
      'bool', 'int', 'char', 'void', 'float',
    ],
    operators: [
      '=',
      '>',
      '<',
      '!',
      '~',
      '?',
      ':',
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
      '&',
      '|',
      '^',
      '%',
      '<<',
      '>>',
      '>>>',
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
    tokenizer: {
      root: [
        // Rules for token identification
        [/\/\/([^\n]*)\n/, { token: 'invalid', log: `Line Comment ${1}` }],
        [/./, { token: 'invalid', log: `Invalid item found ${0}` }],
      ],
    },
    tokenPostfix: '.picol'
};

const registerLanguage = (monaco: any): void => {
  
  monaco.languages.register({ id: 'Picol' });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider('Picol', picolLanguage);

  monaco.editor.defineTheme('PicolTheme', {
    base: 'vs',
    inherit: false,
    rules: [
      { token: 'invalid', foreground: 'efefff', background: 'ff0000', fontStyle: 'bold' },
    ],
  });
};

export default { registerLanguage };
