<template>
  <div class="memory-view" v-if="memoryData && memoryData.length">
    <div v-for="(c, i) in memoryData" class="memory-view-row">
      <pre class="index">{{i}}</pre>
      <pre class="value">{{c}}</pre> 
    </div>
  </div>
  <div v-else class="empty-tip">
    Empty memory section
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';

@Component({
  name: 'memory-view'
})
export default class MemoryView extends Vue {
  @Prop memoryData = p({type: Array})

}
</script>

<style scoped>
  .memory-view {
    flex: 1;
    overflow-y: auto;
    height: 100%;
  }
  .memory-view-row{
    display: flex;
    text-align: center;
    line-height: 20px;
    height: 20px;
    font-size: 16px;
  }
  .memory-view-row pre {
    display: block;
    height: 20px;
    padding: 0;
    margin: 0;
  }
  .memory-view-row + .memory-view-row {
    border-top: dotted 1px #ccc;
  }
  .memory-view-row .index{
    min-width: 45px;
    color: #aaa;
  }
  .memory-view-row .value{
    flex: 1;
  }
  .empty-tip{
    text-align: center;
    font-size: 1.5em;
    color: #ccc;
    height: 100%;
  }
</style>
