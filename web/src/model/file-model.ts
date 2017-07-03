/// <reference path="../../../node_modules/monaco-editor/monaco.d.ts" />

import sampleList from '../util/picol-sample';

export interface IEditingFile {
  name: string;
  savedSrc: string;
  version: number;
  src: string;
  model?: monaco.editor.IModel;
}

const STORAGE_KEY = 'file-model';

class FileModel {
  public current: number;
  public fileList: IEditingFile[] = [];

  public get templateList(): string[] {
    return Object.keys(sampleList).filter( (k) => k !== 'default');
  }

  public get currentFile(): IEditingFile {
    return this.fileList[this.current];
  }

  constructor() {
    const storeModel = window.localStorage.getItem(STORAGE_KEY);
    if (storeModel) {
      const store = JSON.parse(storeModel) as IEditingFile[];
      if (store.some && !store.some((f) =>
        f.name === undefined
        || f.savedSrc === undefined
        || f.src === undefined)) {
        console.log('load local storage');
        this.fileList = store;
      }
      this.current = 0;
    }
    if (!this.fileList || !this.fileList.length) {
      this.fileList = [];
      this.addNew();
      this.loadTemplate('default');
    }

    window.addEventListener('storage', (ev) => {
      if (ev.key === STORAGE_KEY && ev.oldValue !== ev.newValue) {
        console.log('update');
        if (ev.oldValue === this.getSerializeData()) {
          const newStoreModel = window.localStorage.getItem(STORAGE_KEY);
          const newStore = newStoreModel && JSON.parse(newStoreModel) as IEditingFile[];
          if (!newStore || !newStore.length) {
            // all files are cleaned
            this.deleteAll();
            return;
          }
          this.fileList.forEach((curFile) => {
            const newFile = newStore.find((nf) => nf.name === curFile.name);
            if (!newFile) {
              if (curFile.model) {
                curFile.model.dispose();
              }
            } else {
              newFile.model = curFile.model;
              if (newFile.model) {
                newFile.model.setValue(newFile.src);
              }
            }
          });
          this.fileList = newStore;
          if (this.current >= this.fileList.length) {
            this.current = 0;
          }
        }
      }
    });

    setInterval(() => {
      window.localStorage.setItem(STORAGE_KEY, this.getSerializeData());
    }, 100);
  }

  public addNew() {
    const src = '';
    for (let i = 1; true; i++) {
      const file = 'file-' + i;
      if (this.fileList.every((f) => f.name !== file)) {
        this.fileList.push({ name: file, savedSrc: src, src, version: 0});
        this.current = this.fileList.length - 1;
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

  public saveFile(f: IEditingFile): void {
    f.savedSrc = f.src;
    f.version++;
  }

  public reload(f: IEditingFile): void {
    f.src = f.savedSrc;
    if (f.model) {
      f.model.setValue(f.src);
    }
  }

  public deleteFile(f: IEditingFile): void {
    const index = this.fileList.indexOf(f);
    this.fileList.splice(index, 1);
    if (f.model) {
      f.model.dispose();
    }
    if (this.current > index) {
      this.current = this.current - 1;
    }
    if (this.fileList.length === 0) {
      this.addNew();
    }
    if (this.current < 0 || this.current >= this.fileList.length) {
      this.current = 0;
    }
  }

  public loadTemplate(template: string) {
    if (this.currentFile.savedSrc === this.currentFile.src && this.currentFile.version === 0) {
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

  private getSerializeData() {
    return JSON.stringify(this.fileList.map((f) => ({
      name: f.name, savedSrc: f.savedSrc, src: f.src,
    })));
  }
}

const fileModel = new FileModel();

export default fileModel;
