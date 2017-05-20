<template>
  <monaco-editor :code="code" :options="editorOptions" srcPath='' width='100%' height='100%' theme='PicolTheme' @mounted="editorMounted" language='Picol'>
  </monaco-editor>
</template>

<script lang="ts">
/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Vue } from 'av-ts';
import MonacoTokenizer from '../util/monaco-tokenizer';
import MonacoEditor from './monaco-editor/monaco-editor';

const loadLanguage = (): void => {
  const g: any = window;
  if (g.monaco) {
    MonacoTokenizer.registerLanguage(g.monaco);
  }
};

@Component({
  components: {
    MonacoEditor,
  },
})
export default class Hello extends Vue {
  name = 'hello'
  code = MonacoTokenizer.picolSample.default
  editorOptions = MonacoTokenizer.defaultMonacoEditorOptions

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
