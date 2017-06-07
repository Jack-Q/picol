<template>
  <div class="root" v-if="contextTree">
    <pre>{{dump()}}</pre>
  </div>
  <div v-else>
    No context
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { Quadruple } from '../../../../core/main';


@Component({
  name: 'context-tree',
  components: {
  }
})
export default class ContextTree extends Vue {
  @Prop contextTree = p({type: Object})

  dump() {
    try{
      return (this.contextTree as any).dump();
    } catch(e){
      return e.message;
    }
  }
}
</script>

<style scoped>
  .root{
    flex: 1;
  }
  pre{
    overflow-x: auto;
    height: 100%;
    width: 100%;
    margin: 0;
    font-size: 12px;
  }
</style>
