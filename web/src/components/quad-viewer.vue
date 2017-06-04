<template>
  <div class="root">

  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';

@Component({
  name: 'quad-viewer'
})
export default class QuadViewer extends Vue {
  @Prop quadList = p({type: Object})

  @Lifecycle mounted() { 

  }
}
</script>

<style scoped>

</style>
