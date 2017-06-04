<template>
  <div class="root">
    <div class="header">
      Picol
    </div>
    <div class="body">
      <div class="left-aside">

      </div>
      <div class="main-stack">
        <div class="src-editor">
          <monaco-editor
            :code="code"
            :options="editorOptions"
            srcPath=''
            width='100%'
            height='100%'
            theme='PicolTheme'
            @mounted="editorMounted"
            @codeChange="editorCodeChange"
            language='Picol'>
          </monaco-editor>
        </div>
      </div>
      <div class="right-aside">
        <div>{{ ast || ''}}</div>
        <div>{{quadrupleTable}}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Vue } from 'av-ts';
import MonacoTokenizer from '../util/monaco-tokenizer';
import MonacoEditor from './monaco-editor/monaco-editor';

import core, { Token, TokenType, ParseNode, Quadruple } from '../../../core/main';

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
export default class Index extends Vue {
  name = 'index'
  code = MonacoTokenizer.picolSample.default
  editorOptions = MonacoTokenizer.defaultMonacoEditorOptions
  ast: ParseNode
  quadrupleTable: Quadruple[] = []

  editorMounted() {
    // eslint-disable-next-line
    console.log(this.name);
    loadLanguage();
  }

  editorCodeChange(editor: monaco.editor.ICodeEditor){
    const model = editor.getModel();
    this.code = model.getValue();
    const tokenList = Array.from(core.lexer(this.code));
    const markers: monaco.editor.IMarkerData[] = [];
    tokenList.map((t)=>{
      if(t.type === TokenType.INV_NO_MATCH || t.type === TokenType.INV_VALUE){
        markers.push({
          startLineNumber: t.position.line, 
          startColumn: t.position.col, 
          endLineNumber: t.position.line, 
          endColumn: t.position.col + t.literal.length, 
          message: t.value, 
          severity: monaco.Severity.Error,
          source: "Lexer"
        });
        return;
      } 
      if (t.type === TokenType.SP_WHITE) {
        return;
      }
      // markers.push({
      //   startLineNumber: t.position.line, 
      //   startColumn: t.position.col, 
      //   endLineNumber: t.position.line, 
      //   endColumn: t.position.col + t.literal.length, 
      //   message: TokenType[t.type] + ': ' + JSON.stringify(t.literal) + ' ' + (t.value || ''), 
      //   severity: monaco.Severity.Info,
      //   source: "Lexer"
      // });
    })
    monaco.editor.setModelMarkers(model, "Lexer", markers);
    
    try{
      const ast = core.parser(tokenList);
      this.ast = ast;
      monaco.editor.setModelMarkers(model, "Parser", []); // free of error
    } catch(e){
      const t: Token = e.token || tokenList[tokenList.length - 1];
      monaco.editor.setModelMarkers(model, "Parser", [{
        startLineNumber: t.position.line, 
        startColumn: t.position.col, 
        endLineNumber: t.position.line, 
        endColumn: t.position.col + t.literal.length, 
        message: e.message, 
        severity: monaco.Severity.Error,
        source: "Parser"
      }]);
    }

    try{
      const quadrupleTable = core.generator(this.ast);
      this.quadrupleTable = quadrupleTable;
    }catch(e){

    }
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.root{
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  height: 35px;
}
.body {
  flex: 1;
  display: flex;
}
.body > div {
  height: 100%;
  overflow-y: auto;
}
.left-aside {
  flex: 1;
}
.main-stack {
  flex: 4;
}
.right-aside {
  flex: 1;
}

.src-editor {
  height: 100%;
  width: 100%;
}
</style>
