<template>
  <div class="intermediate-root">
    <context-tree :contextTree="contextTree" />
    <quad-viewer :quadList="quadList" />
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
</style>
