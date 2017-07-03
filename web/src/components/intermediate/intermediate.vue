<template>
  <div class="intermediate-root" v-if="contextTree || quadList.length">
    <context-tree :contextTree="contextTree"></context-tree>
    <quad-viewer :quadList="quadList"></quad-viewer>
  </div>
  <div v-else class="tip">
    Load sample files or type in your own program
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { Quadruple } from '../../../../core/main';
import ContextTree from './context-tree';
import QuadViewer from './quad-viewer';


@Component({
  name: 'intermediate',
  components: {
    QuadViewer,
    ContextTree,
  }
})
export default class Intermediate extends Vue {
  @Prop quadList = p({type: Array})
  @Prop contextTree = p({type: Object})
}
</script>

<style scoped>
.intermediate-root{
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
</style>
