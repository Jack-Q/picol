<template>
  <div class="root" v-if="ast">
    <div>
      <ast-node :ast='ast'></ast-node>
    </div>
  </div>
  <div v-else class="tip">
    Load sample files or type in your own program
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from "av-ts";
import AstNode from "./ast-node.vue";

@Component({
  name: "ast-viewer",
  components: {
    AstNode
  }
})
export default class AstViewer extends Vue {
  @Prop public ast = p({ type: Object });
}
</script>

<style scoped>
.root {
  height: 100%;
  width: 100%;
  overflow: auto;
}

.tip {
  flex: 1;
  margin: auto;
  text-align: center;
  font-size: 1.5em;
  color: #ccc;
}
</style>
