<template>
  <div class="intermediate-root" v-if="contextTree || quadList.length">
    <context-tree :contextTree="contextTree" :isRoot="true"></context-tree>
    <div class="quadruple-list">
      <div v-if="quadList" class="quad-header">
        <div class="quad-header-action" ref="quad-header-dump" @click="dumpQuadruple()">
          <ui-tooltip trigger="quad-header-dump">dump quadruple list</ui-tooltip>
          <i class="material-icons">save</i>
        </div>
      </div>
      <quad-viewer :quadList="quadList"></quad-viewer>
    </div>
  </div>
  <div v-else class="tip">
    Load sample files or type in your own program
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { Quadruple } from '../../../../core/main';
import ContextTree from './context-tree.vue';
import QuadViewer from './quad-viewer.vue';


@Component({
  name: 'intermediate',
  components: {
    QuadViewer,
    ContextTree,
  }
})
export default class Intermediate extends Vue {
  @Prop quadList = p({ type: Array })
  @Prop contextTree = p({ type: Object })

  dumpQuadruple() {
    const quadruple = this.quadList as Quadruple[];
    const content = quadruple.map((q, i) => i + '\t' + q.toString()).join('\n');
    const helperElement = document.createElement('a');
    helperElement.download = 'quadruple-list.txt';
    helperElement.href = window.URL.createObjectURL(new Blob([content], {
      type: 'octet/stream',
    }));
    helperElement.click();
  }
}
</script>

<style scoped>
.intermediate-root {
  display: flex;
  height: 100%;
  align-items: stretch;
  width: 100%;
}

.tip {
  flex: 1;
  margin: auto;
  text-align: center;
  font-size: 1.5em;
  color: #ccc;
}

.quadruple-list {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
}

.quad-header {
  height: 45px;
  background: #eee;
  text-align: right;
  padding: 0 30px;
}

.quad-header-action {
  position: relative;
  height: 45px;
  line-height: 45px;
  cursor: pointer;
  display: inline-block;
  min-width: 45px;
}

.quad-header-action i {
  line-height: 45px;
}
</style>
