///  path="node_modules/monaco-editor/monaco.d.ts" />
import picolLanguage from './picol-monarch-language' ;

const picolTheme: monaco.editor.ITheme = {
  base: 'vs',
  inherit: true,
  rules: [
      { token: 'invalid', foreground: 'ff0000', fontStyle: 'italic' },
  ],
};

const registerLanguage = (monaco: any): void => {

  monaco.languages.register({ id: 'Picol' });

  monaco.languages.setMonarchTokensProvider('Picol', picolLanguage);

  monaco.editor.defineTheme('PicolTheme', picolTheme);
};

export default { registerLanguage };
