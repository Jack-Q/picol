<template>
  <div class="list-container">
    <span class="section">Sample</span>
    <div>
      <list-item v-for='f in model.templateList' :key="f" @click.native="model.loadTemplate(f)">
        <div class="sample">{{f}}</div>
      </list-item>
    </div>
    <span class="section">Editing</span>
    <div class="editing-content">
      <div class="editing-box" ref="editing-box">
        <div class="action" @click="model.addNew()" ref="action-add">
          <ui-icon>add</ui-icon>
          <ui-ripple-ink trigger="action-add"></ui-ripple-ink>
        </div>
        <div class="action" @click="model.deleteAll()" ref="action-delete">
          <ui-icon>delete_sweep</ui-icon>
          <ui-ripple-ink trigger="action-delete"></ui-ripple-ink>
        </div>
        <label class="action" ref="local-file-open">
          <ui-icon>file_upload</ui-icon>
          <ui-ripple-ink trigger="local-file-open"></ui-ripple-ink>
          <input type="file" @change="model.loadLocalFile($event)" hidden required />
        </label>
      </div>
      <div class="editing-list">
        <list-item v-for='(f,i) in model.fileList' :key="f.name" @click.native="model.select(i)">
          <div class="editing-list-item" :class="{current: model.current === i}">
            <div class="content-wrapper">
              <div class="content">
                {{f.name}} <span class="modification-tag">{{f.src !== f.savedSrc ? '*' : ''}}</span>
              </div>
            </div>
            <div class="inline-actions">
              <inline-action icon="settings_backup_restore" tooltip="reload from storage" @click="model.reload(f)"></inline-action>
              <inline-action icon="save" tooltip="save to storage" @click="model.saveFile(f)"></inline-action>
              <inline-action icon="delete" tooltip="delete" @click="model.deleteFile(f)"></inline-action>
              <inline-action icon="file_download" tooltip="download source" @click="model.download(f)"></inline-action>
            </div>
          </div>
        </list-item>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>

import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import fileModel, { IEditingFile } from '../../model/file-model';
import ListItem from './list-item';
import InlineAction from './inline-action';

@Component({
  name: 'left-panel',
  components: {
    ListItem,
    InlineAction,
  },
})
export default class LeftPanel extends Vue {
  model = fileModel;
  @Prop ast = p({ type: Object })

}
</script>

<style scoped>
.list-container {
  background: #eee;
  overflow-y: auto;
  height: 100%;
  min-width: 220px;
  display: flex;
  flex-direction: column;
}

.section {
  text-align: center;
  display: block;
  font-family: 'Josefin Slab';
  text-transform: uppercase;
  text-shadow: 0 0 3px #fff;
  padding: 20px 0 0;
  border-bottom: solid 1px #aaa;
}

.sample {
  line-height: 30px;
  padding: 10px 20px;
}

.editing-content {

  min-height: 200px;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.editing-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.editing-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.action {
  padding: 2px 15px;
  cursor: pointer;
  position: relative;
  color: #999;
}

.editing-list-item {
  overflow: hidden;
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 100%;
  line-height: 30px;
  padding: 10px 20px;
}

.content-wrapper {
  flex: 1 1;
  position: relative;
}


.content {
  position: absolute;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 5px;
  z-index: 20;
  background: rgba(238,238,238,0.7);
  padding: 0 5px;
  margin: 0 0 0 -5px;
  /* hide content when move cursor away from label */
  pointer-events: none;
}

.content-wrapper:hover .content {
  width: auto;
}

.inline-actions {
  z-index: 10;
  opacity: 0.3;
  transition: all ease 400ms;
}

.modification-tag {
  color: #09c;
}

.editing-list-item::after {
  transition: all ease 400ms;
  display: block;
  content: '';
  width: 0;
  border-top: 25px transparent solid;
  border-bottom: 25px transparent solid;
  border-right: 20px #fff solid;
  right: -20px;
  opacity: 0;
  position: absolute;
  z-index: 1;
  pointer-events: none;
  top: 0;
}

.editing-list-item.current::after {
  right: 0;
  opacity: 1;
}

.editing-list-item:hover .inline-actions {
  opacity: 1;
}
</style>
