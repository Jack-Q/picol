<template>
  <div ref="root" class="inline-action" @click.stop="click">
    <ui-tooltip trigger="root">{{tooltip}}</ui-tooltip>
    <ui-icon>{{icon}}</ui-icon>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';

@Component({
  name: 'inline-action'
})
export default class InlineAction extends Vue {
  @Prop icon = p({type: String});
  @Prop tooltip = p({type: String});
  click(e: any) {
    this.$emit('click', e);
  }
}
</script>

<style>
  
.inline-action {
  padding: 10px 5px; 
  display: inline-block;
  margin: -10px 0;
  color: #aaa;
  transition: all ease 400ms;
  cursor: pointer;
  position: relative;
}

.inline-action:hover {
  color: #5cf;
}

</style>
