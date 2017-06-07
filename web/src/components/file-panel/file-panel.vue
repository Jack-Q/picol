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
        <list-item v-for='(f,i) in model.fileList' :key="f.name" @click.native="model.select(i)">{{f.name}}</list-item>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import fileModel from '../../model/file-model';
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
}

.action {
  padding: 2px 15px;
  cursor: pointer;
  position: relative;
  color: #999;
}
</style>
