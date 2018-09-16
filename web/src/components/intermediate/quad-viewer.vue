<template>
  <div class="root">
    <div v-if="quadruples.length" class="list" ref='quad-list'>
      <div v-for="q in quadruples" 
           :key="q.i + 1" 
           :ref="'quad-item-' + (q.i + 1)" 
           class="quadruple-item" 
           :class="{highlight: q.i + 1 === highlight}"
           @click="scrollToQuad(q.reLink || q.i + 2)">
        <div class="quad-index">{{q.i + 1}}</div>
        <div class="quad-op">{{q.op}}</div>
        <div class="quad-arg">{{q.a1}}</div>
        <div class="quad-arg">{{q.a2}}</div>
        <div v-if="q.reLink !== undefined" class="quad-link">
          (<span>{{q.reLink}}</span>)
        </div>
        <div v-else class="quad-arg">{{q.re}}</div>
        <div class="comment">{{q.cm}}</div>
      </div>
    </div>
    <div v-else class="tip">
      Load sample files or type in your own program
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';
import { Quadruple, QuadrupleArgType } from '../../../../core/main';

@Component({
  name: 'quad-viewer'
})
export default class QuadViewer extends Vue {
  @Prop quadList = p<Quadruple[]>({type: Array})
  @Prop highlight = p({type: Number})

  @Lifecycle mounted() { 

  }

  @Watch('highlight')
  handler(newVal: number, oldVal: number) {
    // scroll the quadruple list
    this.scrollToQuad(newVal);
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
        reLink: quadruple.result.type === QuadrupleArgType.QUAD_REF 
          ? (quadruple.result as any).quadIndex : undefined,
        cm: quadruple.comment,
      }
    });
  }

  public scrollToQuad(index: number){
    const list = this.$refs['quad-list'] as Element;
    const newItem = this.$refs['quad-item-' + index] as Element[];
    if(!newItem || !newItem[0])
      return;
    const offsetTop = (newItem[0] as any).offsetTop;
    const scrollTop = offsetTop > list.clientHeight / 2 ? offsetTop - list.clientHeight / 2 : 0;
    const oldScrollTop = list.scrollTop;

    if(scrollTop === oldScrollTop) {
      return;
    }

    // animate scroll to effect
    let delta = oldScrollTop - scrollTop;
    const ani = () => {
      delta *= 0.9;
      if(Math.abs(delta) < 3){
        list.scrollTop = scrollTop;
        return;
      }
      list.scrollTop = scrollTop + delta;
      requestAnimationFrame(ani);
    };
    requestAnimationFrame(ani);
  }
}
</script>

<style scoped>
.root {
  flex: 1;
  min-width: 280px;
}
.list {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
  position: relative;
}
.quadruple-item {
  position: relative;
  display: flex;
  line-height: 30px;
  font-size: 16px;
  background: #efefef;
  transition: all ease 400ms;
}
.quadruple-item.highlight {
  background: #8fffba;
  text-shadow: 0 0 2px #000;
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
  letter-spacing: -1px;
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
.quad-op, .quad-arg, .quad-link{
  flex: 3;
  text-align: center;
}
.quad-link span {
  color: #09c;
}

.tip {
  text-align: center;
  font-size: 1.5em;
  color: #ccc;
  height: 100%;
}
</style>
