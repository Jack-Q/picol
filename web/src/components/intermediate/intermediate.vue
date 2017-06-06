<template>
  <div class="root">
    <quad-viewer :quadList="quadList" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { Quadruple } from '../../../../core/main';
import QuadViewer from './quad-viewer';


@Component({
  name: 'intermediate',
  components: {
    QuadViewer
  }
})
export default class Intermediate extends Vue {
  @Prop quadList = p({type: Array})
  @Prop contextTree = p({type: Object})
}
</script>

<style scoped>
</style>
