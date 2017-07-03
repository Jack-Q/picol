<template>
  <div class='wrapper' ref="wrapper">
    <slot></slot>
    <ui-ripple-ink trigger="wrapper" ></ui-ripple-ink>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';

@Component({
  name: 'list-view'
})
export default class ListViewer extends Vue {
  @Prop on = p({type: Boolean})
}
</script>

<style>
.wrapper{
  width: 100%;
  height: 50px;
  position: relative;
  background: #eee;
  transition: all ease 400ms;
}

.wrapper + .wrapper {
  border-top: dotted 1px #adf;
}
</style>
