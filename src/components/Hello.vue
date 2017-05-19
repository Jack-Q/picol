<template>
  <monaco-editor :code="code" :options="editorOptions" srcPath='' width='100%' height='100%' theme='PicolTheme' @mounted="editorMounted" language='Picol'>
  </monaco-editor>
</template>

<script lang="ts">
/// <reference path="../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Vue } from 'av-ts';
import MonacoTokenizer from '../util/monaco-tokenizer';
import MonacoEditor from './monaco-editor/monaco-editor';

const editorOptions = {
  selectOnLineNumbers: true,
  roundedSelection: true,
  readOnly: false,
  cursorStyle: 'line',
  automaticLayout: true,
  glyphMargin: true,
  language: 'Picol',
  theme: 'PicolTheme',
};

const loadLanguage = (): void => {
  const g: any = window;
  if (g.monaco) {
    MonacoTokenizer.registerLanguage(g.monaco);
  }
};

const defaultCodeSnippet =
`// Feel free to explore the World of Picol
int main () {
  // Declare an matrix of matrix
  float[2,2][2,2] a;
  int i = 0, j = 0;
}`;

@Component({
  components: {
    MonacoEditor,
  },
})
export default class Hello extends Vue {
  name = 'hello'
  code = defaultCodeSnippet
  editorOptions = editorOptions

  editorMounted() {
    // eslint-disable-next-line
    console.log(this.name);
    loadLanguage();
  }

}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
