<template>
  <div class="root">
    <div v-if="ast">
      <ast-node :ast='ast'></ast-node>
    </div>
    <div v-else class="tip">
      Load sample files or type in your own program
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import AstNode from './ast-node';

@Component({
  name: 'ast-viewer',
  components: {
    AstNode
  }
})
export default class AstViewer extends Vue {
  @Prop ast = p({type: Object})
}
</script>

<style scoped>
.root {
  height: 100%;
  width: 100%;
  overflow: auto;
}
</style>
