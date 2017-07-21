<template>
  <div class="root">
    <a href="https://github.com/Jack-Q/picol" title="fork me on GitHub" class="github-corner" aria-label="View source on Github">
      <svg width="80" height="80" viewBox="0 0 250 250" aria-hidden="true">
        <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
        <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path>
        <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body">
        </path>
      </svg>
    </a>
    <div class="header">
      <div class="logo-box">
        <svg class="logo" viewBox="0 0 200 100">
          <g>
            <path d="M 8.125 0 L 45.625 50 L 15 50 L 0 50 L 0 65 L 0 100 L 15 100 L 15 65 L 45.625 65 L 19.375 100 L 38.125 100 L 70 57.5 L 26.875 0 L 8.125 0 z M 138.125 0 L 95 57.5 L 126.875 100 L 145.625 100 L 113.75 57.5 L 156.875 0 L 138.125 0 z M 185 0 L 185 85 L 200 85 L 200 0 L 185 0 z M 75 15 L 75 75 L 90 75 L 90 15 L 75 15 z M 152.5 40 A 17.500001 17.499955 0 0 0 135 57.5 A 17.500001 17.499955 0 0 0 152.5 75 A 17.500001 17.499955 0 0 0 170 57.5 A 17.500001 17.499955 0 0 0 152.5 40 z M 82.5 80 A 7.5000002 7.4999853 0 0 0 75 87.5 A 7.5000002 7.4999853 0 0 0 82.5 95 A 7.5000002 7.4999853 0 0 0 90 87.5 A 7.5000002 7.4999853 0 0 0 82.5 80 z " />
          </g>
        </svg>
        <a href="https://github.com/Jack-Q/" class="header-right">
          <svg height="20" aria-label="code" viewBox="0 0 14 16" version="1.1" width="17" role="img">
            <path d="M9.5 3L8 4.5 11.5 8 8 11.5 9.5 13 14 8 9.5 3zm-5 0L0 8l4.5 5L6 11.5 2.5 8 6 4.5 4.5 3z"></path>
          </svg>
          with
          <svg height="20" aria-label="love" viewBox="0 0 12 16" version="1.1" width="15" role="img">
            <path d="M11.2 3c-.52-.63-1.25-.95-2.2-1-.97 0-1.69.42-2.2 1-.51.58-.78.92-.8 1-.02-.08-.28-.42-.8-1-.52-.58-1.17-1-2.2-1-.95.05-1.69.38-2.2 1-.52.61-.78 1.28-.8 2 0 .52.09 1.52.67 2.67C1.25 8.82 3.01 10.61 6 13c2.98-2.39 4.77-4.17 5.34-5.33C11.91 6.51 12 5.5 12 5c-.02-.72-.28-1.39-.8-2.02V3z"></path>
          </svg>
          by Jack Q
        </a>
        <div class="logo-tip">
          Picol
        </div>
      </div>
  
    </div>
    <div class="body">
      <div class="left-aside">
        <file-panel />
      </div>
      <div class="main-stack">
        <ui-tabs type="icon" fullwidth>
          <ui-tab icon="code">
            <div class="src-editor">
              <monaco-editor :code="code" :options="editorOptions" srcPath='./' width='100%' height='100%' theme='PicolTheme' @mounted="editorMounted($event)" @codeChange="editorCodeChange" language='Picol'>
              </monaco-editor>
            </div>
            <div class="src-aside">
              <ui-tabs>
                <ui-tab title="token list">
                  <token-list :tokenList="tokenList" @selectPosition="selectPosition($event)"></token-list>
                </ui-tab>
                <ui-tab title="error list">
                  <error-list :errorList="errorList" @selectPosition="selectPosition($event)"></error-list>
                </ui-tab>
              </ui-tabs>
            </div>
          </ui-tab>
          <ui-tab icon="device_hub">
            <ast-viewer :ast="ast"></ast-viewer>
          </ui-tab>
          <ui-tab icon="list">
            <intermediate :quadList="quadrupleTable" :contextTree="contextTree" />
          </ui-tab>
          <ui-tab icon="playlist_play">
            <execution :program="quadrupleTable" />
          </ui-tab>
        </ui-tabs>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Vue, Lifecycle } from 'av-ts';
import fileModel from '../model/file-model';
import MonacoTokenizer from '../util/monaco-tokenizer';

import ErrorList from './editor/error-list';
import MonacoEditor from './editor/monaco-editor';
import TokenList from './editor/token-list';
import FilePanel from './file-panel/file-panel';
import AstViewer from './syntax/ast-viewer';
import Intermediate from './intermediate/intermediate';
import QuadViewer from './intermediate/quad-viewer';
import Execution from './execution/execution';

import core, { Token, TokenType, ParseNode, Quadruple, ExecutionContext, PicolError, RangePosition } from '../../../core/main';

const loadLanguage = (): void => {
  const g: any = window;
  if (g.monaco) {
    MonacoTokenizer.registerLanguage(g.monaco);
  }
};

const createMarker = (source: string, message: string, t: Token): monaco.editor.IMarkerData => ({
  startLineNumber: t.position.startLine,
  startColumn: t.position.startCol,
  endLineNumber: t.position.endLine || t.position.startLine,
  endColumn: t.position.endCol || t.position.startCol + t.literal.length,
  message,
  severity: monaco.Severity.Error,
  source: source
});

@Component({
  name: 'index',
  components: {
    MonacoEditor,
    ErrorList,
    TokenList,
    AstViewer,
    QuadViewer,
    Intermediate,
    FilePanel,
    Execution,
  },
})
export default class Index extends Vue {
  editor: monaco.editor.ICodeEditor;
  editorOptions = MonacoTokenizer.defaultMonacoEditorOptions;
  ast: ParseNode | null = null;
  tokenList: Token[] = [];
  quadrupleTable: Quadruple[] = [];
  errorList: PicolError[] = [];
  contextTree: ExecutionContext | null = null;

  get code(): string {
    return fileModel.currentFile.src;
  }

  editorMounted(editor: monaco.editor.ICodeEditor) {
    this.editor = editor;
    loadLanguage();

    const standAloneCodeEditor = this.editor as monaco.editor.IStandaloneCodeEditor;
    standAloneCodeEditor.addAction({
      // Save Content Action (Ctrl + S)
      id: 'editor-save-content',
      label: 'Save Content to Storage',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
      run: (editor) => {
        fileModel.saveFile(fileModel.currentFile);
      }
    });
    standAloneCodeEditor.addAction({
      // Reload Content Action (Ctrl + R)
      id: 'editor-reload-content',
      label: 'Reload Content from Storage',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R],
      run: (editor) => {
        fileModel.reload(fileModel.currentFile);
      }
    });
    standAloneCodeEditor.addAction({
      // Delete File Action (Ctrl + Shift + Delete)
      id: 'editor-delete-content',
      label: 'Delete Current File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Delete],
      run: (editor) => {
        fileModel.deleteFile(fileModel.currentFile);
      }
    });
  }

  @Lifecycle beforeUpdate() {
    // update model selection
    const current = fileModel.currentFile;
    if (!current.model || current.model !== this.editor.getModel()) {
      if (this.editor) {
        if (!current.model) {
          current.model = monaco.editor.createModel(current.src, 'Picol');
        }
        this.editor.setModel(current.model);
        // trigger an code change for compiling content synchronization
        this.editorCodeChange(this.editor);
      }
    }
  }

  editorCodeChange(editor: monaco.editor.ICodeEditor) {
    const model = editor.getModel();
    const code = model.getValue();
    fileModel.currentFile.src = code;

    // clear last error
    this.errorList = [];

    // Lexer
    const lexerMarkers: monaco.editor.IMarkerData[] = [];
    const tokenList = Array.from(core.lexer(code));
    this.tokenList = tokenList;
    tokenList.map((t) => {
      if (t.type === TokenType.INV_NO_MATCH || t.type === TokenType.INV_VALUE) {
        this.errorList.push(PicolError.lexerError('unknown token', t));
        lexerMarkers.push(createMarker("Lexer", t.value, t));
        return;
      }
      if (t.type === TokenType.SP_WHITE) {
        return;
      }
    })
    monaco.editor.setModelMarkers(model, "Lexer", lexerMarkers);

    // Parser
    const parserMarkers: monaco.editor.IMarkerData[] = [];
    try {
      const parserResult = core.parser(tokenList);
      const ast = parserResult.ast;
      this.ast = ast;
      if (parserResult.errorList.length > 0) {
        // add errors to side list
        this.errorList.push(...parserResult.errorList);
        // add errors
        parserResult.errorList.map((e) => {
          const t = e.token || tokenList[tokenList.length - 1];
          parserMarkers.push(createMarker("Parser", e.message, t));
        });
      }
    } catch (e) {
      console.log(e)
      this.errorList.push(e as PicolError);
      const t: Token = e.token || tokenList[tokenList.length - 1];
      parserMarkers.push(createMarker("Parser", e.message, t));
    }
    monaco.editor.setModelMarkers(model, "Parser", parserMarkers);

    // Generator
    const generatorMarkers: monaco.editor.IMarkerData[] = [];
    try {
      if (this.ast) {
        const context = core.generator(this.ast);
        this.contextTree = context.contextTree;
        this.quadrupleTable = context.quadrupleList;

        const errorList: PicolError[] = context.errorList;
        this.errorList.push(...errorList);
        // add errors
        errorList.map((e) => {
          const t = e.token || tokenList[tokenList.length - 1];
          generatorMarkers.push(createMarker("Generator", e.message, t));
        });
      }
    } catch (e) {
      this.errorList.push(e as PicolError);
      const t: Token = e.token || tokenList[tokenList.length - 1];
      generatorMarkers.push(createMarker("Generator", e.message, t));
    }
    monaco.editor.setModelMarkers(model, "Generator", generatorMarkers);

  }

  selectPosition(pos: RangePosition) {
    this.editor.setSelection({
      startLineNumber: pos.startLine,
      startColumn: pos.startCol,
      endLineNumber: pos.endLine,
      endColumn: pos.endCol,
    })
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
a {
  color: #42b983;
}

a.github-corner {
  transform: rotate(45deg);
  width: 114px;
  height: 114px;
  position: fixed;
  top: -57px;
  right: -57px;
  z-index: 1000;
  overflow: hidden;
}

.github-corner svg {
  fill: #70B7FD;
  color: #fff;
  position: absolute;
  top: 0;
  border: 0;
  right: 0;
  z-index: 10000;
  transform: rotate(-45deg) translate(-64px, 40px);
}

.github-corner:hover .octo-arm {
  animation: octocat-wave 560ms ease-in-out
}

@keyframes octocat-wave {
  0%,
  100% {
    transform: rotate(0)
  }
  20%,
  60% {
    transform: rotate(-25deg)
  }
  40%,
  80% {
    transform: rotate(10deg)
  }
}

@media (max-width:500px) {
  .github-corner:hover .octo-arm {
    animation: none
  }
  .github-corner .octo-arm {
    animation: octocat-wave 560ms ease-in-out
  }
}

.root {
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
  box-shadow: 0 0 10px 2px #aaa;
}

.logo-tip {
  line-height: 35px;
  margin: 5px auto;
  font-size: 30px;
}

.header-right {
  top: 0;
  right: 0;
  position: absolute;
  display: block;
  padding-right: 70px;
  color: #999;
  transition: all ease 400ms;
  text-decoration: none;
  height: 35px;
  line-height: 35px;
  font-size: 18px;
}

.logo-box:hover .header-right {
  height: 80px;
  line-height: 80px;
}

.header-right:hover {
  padding-left: 30px;
  padding-right: 85px;
  color: #666;
  background: rgba(255, 255, 255, 0.25);
}

.header-right svg {
  fill: #999;
  vertical-align: middle;
}

.body {
  flex: 1;
  display: flex;
}

.body>div {
  position: relative;
}

.left-aside {
  overflow-y: hidden;
  flex: 1;
  min-width: 220px;
}


/* fix the height positioning issue in Safari */

.left-aside>div,
.main-stack>div {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
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
  display: flex;
  width: 100%;
}

.main-stack .ui-tabs__body {
  margin: 0;
  padding: 0;
  flex: 1;
  height: calc(100% - 45px);
  border: 0;
}

.right-aside {
  flex: 1;
  min-width: 280px;
}

.src-editor {
  height: 100%;
  width: calc(100% - 400px);
  /*flex: 1;*/
}

.src-aside {
  height: 100%;
  width: 400px;
}
</style>
