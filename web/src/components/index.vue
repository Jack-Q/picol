<template>
  <div class="root">
    <div class="header">
      <div class="logo-box">
        <svg
          class="logo"
          viewBox="0 0 200 100">
          <g>
            <path
              d="M 8.125 0 L 45.625 50 L 15 50 L 0 50 L 0 65 L 0 100 L 15 100 L 15 65 L 45.625 65 L 19.375 100 L 38.125 100 L 70 57.5 L 26.875 0 L 8.125 0 z M 138.125 0 L 95 57.5 L 126.875 100 L 145.625 100 L 113.75 57.5 L 156.875 0 L 138.125 0 z M 185 0 L 185 85 L 200 85 L 200 0 L 185 0 z M 75 15 L 75 75 L 90 75 L 90 15 L 75 15 z M 152.5 40 A 17.500001 17.499955 0 0 0 135 57.5 A 17.500001 17.499955 0 0 0 152.5 75 A 17.500001 17.499955 0 0 0 170 57.5 A 17.500001 17.499955 0 0 0 152.5 40 z M 82.5 80 A 7.5000002 7.4999853 0 0 0 75 87.5 A 7.5000002 7.4999853 0 0 0 82.5 95 A 7.5000002 7.4999853 0 0 0 90 87.5 A 7.5000002 7.4999853 0 0 0 82.5 80 z "/>
          </g>
        </svg>
        <div class="logo-tip">
          Picol
        </div>
      </div>
    </div>
    <div class="body">
      <div class="left-aside">

      </div>
      <div class="main-stack">
        <ui-tabs type="icon" fullwidth>
          <ui-tab icon="code">
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
          </ui-tab>
          <ui-tab icon="device_hub">
              <ast-viewer :ast="ast"></ast-viewer>
          </ui-tab>
          <ui-tab icon="list">
              <quad-viewer :quadList="quadrupleTable"></quad-viewer>
          </ui-tab>
          <ui-tab icon="playlist_play">
          </ui-tab>
        </ui-tabs>
      </div>
      <div class="right-aside">
        <quad-viewer :quadList="quadrupleTable"></quad-viewer>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Vue } from 'av-ts';
import MonacoTokenizer from '../util/monaco-tokenizer';
import MonacoEditor from './monaco-editor/monaco-editor';

import AstViewer from './ast-viewer';
import QuadViewer from './quad-viewer';

import core, { Token, TokenType, ParseNode, Quadruple } from '../../../core/main';

const loadLanguage = (): void => {
  const g: any = window;
  if (g.monaco) {
    MonacoTokenizer.registerLanguage(g.monaco);
  }
};

@Component({
  name: 'index',
  components: {
    MonacoEditor,
    AstViewer,
    QuadViewer,
  },
})
export default class Index extends Vue {
  code = MonacoTokenizer.picolSample.default
  editorOptions = MonacoTokenizer.defaultMonacoEditorOptions
  ast: ParseNode|null = null
  quadrupleTable: Quadruple[] = []

  editorMounted() {
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
      if(this.ast){
        const quadrupleTable = core.generator(this.ast);
        this.quadrupleTable = quadrupleTable;
      }
    }catch(e){

    }
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.root{
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  height: 35px;
  font-family: 'Josefin Slab';
  text-align: center;
  background: #eee;
  z-index: 100;
}
.logo-box {
  width: 100%;
  transition: all ease 400ms;
  height: 35px;
  overflow: hidden;
  background: #eee;
}
.header .logo {
  height: 35px;
  width: 70px;
  fill: #999;
}
.logo-box:hover {
  height: 80px;
}
.logo-tip {
  line-height: 35px;
  margin: 5px auto;
  font-size: 30px;
}
.body {
  flex: 1;
  display: flex;
}
.body > div {
  height: 100%;
  overflow-y: hidden;
}
.left-aside {
  flex: 1;
}
.main-stack {
  flex: 4;
  position: relative;
}

.main-stack .ui-tabs {
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.main-stack .ui-tab {
  height: 100%;
}

.main-stack .ui-tabs__body {
  margin: 0;
  padding: 0;
  flex: 1;
  height: calc(100% - 45px)
}

.right-aside {
  flex: 1;
  min-width: 280px;
}

.src-editor {
  height: 100%;
  width: 100%;
}
</style>
