///  path="monaco-editor/monaco.d.ts" />
import {picolLanguage, picolLanguageCompletionItemProvider} from './picol-monarch-language';
import picolSample from './picol-sample';

const picolTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
      { token: 'invalid', foreground: 'af3a3a', fontStyle: 'italic underline' },
      { token: 'error', foreground: 'ff0000', fontStyle: 'bold underline italic' },
      { token: 'type', foreground: 'aa3afa', fontStyle: 'bold' },
      { token: 'operator', foreground: 'aabafa', fontStyle: 'bold' },
      { token: 'delimiter', foreground: '5adaca', fontStyle: 'bold' },
  ],
  colors: {
    'editor.inactiveSelectionBackground': '#aabbcc',
  },
};

const registerLanguage = (monaco: any): void => {

  monaco.languages.register({ id: 'Picol' });

  monaco.languages.setMonarchTokensProvider('Picol', picolLanguage);
  monaco.languages.registerCompletionItemProvider('Picol', picolLanguageCompletionItemProvider);

  monaco.editor.defineTheme('PicolTheme', picolTheme);
  monaco.editor.setTheme('PicolTheme');
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
  // theme: 'PicolTheme',
  renderWhitespace: 'boundary',
};

export default {
  registerLanguage,
  defaultMonacoEditorOptions,
  picolLanguage,
  picolSample,
  picolTheme,
};
