<template>
  <div class="root">
    <div v-if="quadruples.length" class="list">
      <div v-for="q in quadruples" class="quadruple-item">
        <div class="quad-index">{{q.i + 1}}</div>
        <div class="quad-op">{{q.op}}</div>
        <div class="quad-arg">{{q.a1}}</div>
        <div class="quad-arg">{{q.a2}}</div>
        <div class="quad-arg">{{q.re}}</div>
        <div class="comment">{{q.cm}}</div>
      </div>
    </div>
    <div v-else class="tip">
      Load sample files or type in your own program
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { Quadruple } from '../../../../core/main';

@Component({
  name: 'quad-viewer'
})
export default class QuadViewer extends Vue {
  @Prop quadList = p({type: Array})

  @Lifecycle mounted() { 

  }

  public get quadruples() {
    if(!this.quadList || !this.quadList.length)
      return [];
    return this.quadList.map((quadruple:Quadruple, index: number) => {
      return {
        i: index,
        op: quadruple.operatorName,
        a1: quadruple.argument1.toString(),
        a2: quadruple.argument2.toString(),
        re: quadruple.result.toString(),
        cm: quadruple.comment,
      }
    });
  }
}
</script>

<style scoped>
.root {
  flex: 0;
  min-width: 280px;
}
.list {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
}
.quadruple-item {
  position: relative;
  display: flex;
  line-height: 30px;
  font-size: 16px;
  background: #efefef;
  transition: all ease 400ms;
}
.quadruple-item:hover {
  background: #fafaff;
}
.quadruple-item + .quadruple-item {
  border-top: dashed 1px #fbd;
}

.comment {
  position: absolute;
  z-index: 1;
  transition: all ease 400ms;
  background: rgba(195,180,235,0.85);
  max-width: 100%;
  right: 10px;
  padding-left: 20px;
  border-radius: 15px 0 0 15px;
  font-weight: 400;
  text-shadow: 0 0 2px #aaa;
  transform: translateX(100%);
  font-size: 0.8em;
  text-align: center;
  min-width: 35%;
}

.quadruple-item:hover .comment{
  margin-right: -10px;
  transform: translateX(0%);
}

.quad-index {
  text-align: center;
  font-family: monaco, 'Courier New', Courier, monospace;
  font-weight: 100;
  color: #555;
  font-size: 0.7em;
  flex: 0.7;
}
.quad-op, .quad-arg {
  flex: 3;
  text-align: center;
}
</style>
