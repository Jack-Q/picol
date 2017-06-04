<template>
  <div :style="style"></div>
</template>

<script lang='ts'>
/// <reference path="../../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Vue, p, Prop, Lifecycle, Watch } from 'av-ts';
import { debounce } from 'lodash';
import monacoLoader from './monaco-loader';

@Component({
  name: 'MonacoEditor',
})
export default class MonacoEditor extends Vue {
  @Prop width = p({ type: String, default: '100%' })
  @Prop height = p({ type: String, default: '100%' })
  @Prop code = p({ type: String, default: '// code \n' })
  @Prop srcPath = p({ type: String })
  @Prop language = p({ type: String, default: 'javascript' })
  @Prop theme = p({ type: String, default: 'vs' })
  @Prop options= p({ default: () => {} })
  @Prop highlighted = p({ type: Array, default: () => [{ number: 0, class: '' }] })
  @Prop changeThrottle = p({ type: Number, default: 0 })

  @Lifecycle mounted() { this.fetchEditor(); }
  @Lifecycle destroyed() { this.destroyMonaco(); }

  defaults: {} = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: false,
    glyphMargin: true,
  }

  editor: monaco.editor.ICodeEditor
  monaco: any
  codeChangeEmitter: any

  get style() {
    const { width, height } = this;
    const fixedWidth = width.toString().indexOf('%') !== -1 ? width : `${width}px`;
    const fixedHeight = height.toString().indexOf('%') !== -1 ? height : `${height}px`;
    return {
      width: fixedWidth,
      height: fixedHeight,
    };
  }

  get editorOptions() {
    return Object.assign({}, this.defaults, this.options, {
      value: this.code,
      language: this.language,
      theme: this.theme,
    });
  }

  @Watch('highlighted', { deep: true })
  handler(lines: any[]) {
    this.highlightLines(lines);
  }

  highlightLines(lines: any[]) {
    if (!this.editor) {
      return;
    }
    lines.forEach((line) => {
      const className = line.class;
      const highlighted = this.$el.querySelector(`.${className}`);

      if (highlighted) {
        highlighted.classList.remove(className);
      }

      const number = parseInt(line.number, 10);
      if ((!this.editor && number < 1) || isNaN(number)) {
        return;
      }

      const selectedLine = this.$el.querySelector(`.view-lines [linenumber="${number}"]`);
      if (selectedLine) {
        selectedLine.classList.add(className);
      }
    });
  }

  codeChangeHandler(editor: any) {
    if (this.codeChangeEmitter) {
      this.codeChangeEmitter(editor);
    } else {
      const throttle: number = +this.changeThrottle;
      this.codeChangeEmitter = debounce(() => this.$emit('codeChange', editor), throttle);
      this.codeChangeEmitter(editor);
    }
  }

  fetchEditor() {
    const path: string = this.srcPath as string || '';
    monacoLoader.load(path, this.createMonaco);
  }

  createMonaco() {
    const global: any = window;
    this.monaco = global.monaco;
    this.$emit('mounted', this.editor);
    this.editor = global.monaco.editor.create(this.$el, this.editorOptions);
    global.editor = this.editor;
    this.editor.onDidChangeModelContent(() => this.codeChangeHandler(this.editor));
    this.codeChangeHandler(this.editor); // manually trigger an initial code update
  }

  destroyMonaco() {
    if (typeof this.editor !== 'undefined') {
      this.editor.dispose();
    }
  }
}
</script>
