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
          <ui-ripple-ink trigger="action-add" ></ui-ripple-ink>
        </div>
        <div class="action" @click="model.deleteAll()" ref="action-delete">
          <ui-icon>delete_sweep</ui-icon>
          <ui-ripple-ink trigger="action-delete" ></ui-ripple-ink>
        </div>
      </div>
      <div class="editing-list">
        <list-item v-for='(f,i) in model.fileList' :key="f.name" @click.native="model.select(i)" >
          <div class="editing-list-item" :class="{current: model.current === i}">
            <div class="content">
              {{f.name}}
              {{f.src !== f.savedSrc ? '*' : ''}}
            </div>
            <div class="inline-actions">
              <div class="inline-action" @click.stop="model.saveFile(f)">
                <ui-icon>save</ui-icon>
              </div>
              <div class="inline-action" @click.stop="model.deleteFile(f)">
                <ui-icon>delete</ui-icon>
              </div>
            </div>
          </div>
        </list-item>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>

import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import fileModel, {IEditingFile} from '../../model/file-model';
import ListItem from './list-item';

@Component({
  name: 'left-panel',
  components: {
    ListItem,
  },
})
export default class LeftPanel extends Vue {
  model = fileModel;
  @Prop ast = p({type: Object})
  
}
</script>

<style scoped>
.list-container{
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
.editing-content{
  display: flex;
  flex: 1;
  flex-direction: column;
}
.editing-box{
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.editing-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.action {
  padding: 2px 15px;
  cursor: pointer;
  position: relative;
  color: #999;
}
.editing-list-item{
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 100%;
  line-height: 30px;
  padding: 10px 20px;
}

.content {
  flex: 1;
}

.inline-actions {
  z-index: 10;
  opacity: 0.3;
  transition: all ease 400ms;
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

.editing-list-item.current::after{
  right: 0;
  opacity: 1;
}

.inline-action {
  padding: 10px 5px; 
  display: inline-block;
  margin: -10px 0;
  color: #aaa;
  transition: all ease 400ms;
  cursor: pointer;
}

.inline-action:hover {
  color: #5cf;
}

.editing-list-item:hover .inline-actions{
  opacity: 1;
}
</style>
