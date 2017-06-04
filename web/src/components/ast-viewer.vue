<template>
  <div class="root">
    <div v-if="ast">
      {{ast}}
    </div>
    <div v-else class="tip">
      Load sample files or type in your own program
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';

@Component({
  name: 'ast-viewer'
})
export default class AstViewer extends Vue {
  @Prop ast = p({type: Object})
}
</script>

<style scoped>

</style>
