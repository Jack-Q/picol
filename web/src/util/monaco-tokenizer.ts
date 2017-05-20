///  path="monaco-editor/monaco.d.ts" />
import picolLanguage from './picol-monarch-language';
import picolSample from './picol-sample';

const picolTheme: monaco.editor.ITheme = {
  base: 'vs',
  inherit: true,
  rules: [
      { token: 'invalid', foreground: 'af3a3a', fontStyle: 'italic underline' },
      { token: 'error', foreground: 'ff0000', fontStyle: 'bold underline italic' },
      { token: 'type', foreground: 'aa3afa', fontStyle: 'bold' },
      { token: 'operator', foreground: 'aabafa', fontStyle: 'bold' },
      { token: 'delimiter', foreground: '5adaca', fontStyle: 'bold' },
  ],
};

const registerLanguage = (monaco: any): void => {

  monaco.languages.register({ id: 'Picol' });

  monaco.languages.setMonarchTokensProvider('Picol', picolLanguage);

  monaco.editor.defineTheme('PicolTheme', picolTheme);
};

const defaultMonacoEditorOptions: monaco.editor.IEditorOptions = {
  acceptSuggestionOnCommitCharacter: true,
  autoClosingBrackets: true,
  selectOnLineNumbers: true,
  roundedSelection: true,
  readOnly: false,
  cursorStyle: 'line',
  automaticLayout: true,
  glyphMargin: true,
  // language: 'Picol',
  theme: 'PicolTheme',
};

export default {
  registerLanguage,
  defaultMonacoEditorOptions,
  picolLanguage,
  picolSample,
  picolTheme,
};
