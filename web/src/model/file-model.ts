/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />

import sampleList from '../util/picol-sample';

interface IEditingFile {
  name: string;
  savedSrc: string;
  src: string;
  model?: monaco.editor.IModel;
}

class FileModel {
  public current: number;
  public fileList: IEditingFile[] = [];

  public get templateList(): string[] {
    return Object.keys(sampleList);
  }

  public get currentFile(): IEditingFile {
    return this.fileList[this.current];
  }

  constructor() {
    this.addNew();
    this.loadTemplate('default');
  }

  public addNew() {
    const src = '';
    console.log('new');
    for (let i = 1; true; i++) {
      const file = 'file-' + i;
      if (this.fileList.every((f) => f.name !== file)) {
        this.fileList.push({ name: file, savedSrc: src, src});
        this.current = this.fileList.length - 1;
        console.log(this.fileList);
        if ((window as any).monaco) {
          this.currentFile.model = monaco.editor.createModel(this.currentFile.src, 'Picol');
        }
        return;
      }
    }
  }

  public deleteAll() {
    const oldList = this.fileList;
    this.fileList = [];
    this.addNew();
    oldList.map((f) => {
      if (f.model) {
        f.model.dispose();
      }
    });
  }

  public loadTemplate(template: string) {
    if (this.currentFile.savedSrc === this.currentFile.src) {
      // no file change, apply template to current file
    } else {
      this.addNew();
    }
    this.currentFile.src = this.currentFile.savedSrc = sampleList[template] || '';
    if (this.currentFile.model) { 
      this.currentFile.model.setValue(this.currentFile.src);
    }
  }

  public select(index: number) {
    this.current = index;
  }
}

const fileModel = new FileModel();

export default fileModel;
