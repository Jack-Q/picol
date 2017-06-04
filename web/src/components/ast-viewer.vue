<template>
  <div class="root">
    <svg class="ast">

    </svg>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';

@Component({
  name: 'ast-viewer'
})
export default class AstViewer extends Vue {
  @Prop ast = p({type: Object})

  @Lifecycle mounted() { 

  }
}
</script>

<style scoped>

</style>
