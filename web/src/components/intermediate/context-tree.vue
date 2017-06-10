<template>
  <div class="root" v-if="contextTree" :class="{open: open}">
    <div ref="context-title" class="context-title" @click="open = !open">
      <ui-ripple-ink trigger="context-title" ></ui-ripple-ink>
      <div v-if="contextTree.name" >
        {{contextTree.name}}
      </div>
      <div v-else>
        <i>unnamed</i>
      </div>
    </div>
    <div class="context-body">
      <div class="context-body-wrapper">
        <div v-if="isEmpty(contextTree.nameTable)" class="variable-list">
          <div v-for="(n,i) in contextTree.nameTable" class="variable">
            <pre class="name">{{i}}</pre> 
            <span v-if="n.typeString == 'PRIMITIVE'" class="variable-type primitive">
              <pre>{{n.info.toString()}}</pre> {{n.info.size}} {{n.info.size > 1 ? 'bytes' : 'byte'}}
              <div class="stack-offset">{{n.stackOffset}}</div>
            </span>
            <span v-else-if="n.typeString == 'VOID'" class="variable-type void">
              <pre>{{n.info.toString()}}</pre> 
            </span>
            <span v-else-if="n.typeString == 'ARRAY'" class="variable-type array">
              <pre>{{n.info.toString()}}</pre>
              <div class="stack-offset">{{n.stackOffset}}</div>
              {{n.asArr.dimension}}-dimension array
            </span>
            <span v-else-if="n.typeString == 'ARRAY_REF'" class="variable-type array-ref">
              <pre>{{n.info.toString()}}</pre>
              <div class="stack-offset">{{n.stackOffset}}</div>
              reference to {{n.asArrRef.dimension}}-dimension array
            </span>
            <span v-else-if="n.typeString == 'FUNCTION'" class="variable-type function">
              <pre>{{n.info.toString()}}</pre>
              function, entry at: {{n.info.entryAddress}}{{n.info.entryAddress < 0 ? ', defined by language' : ''}}
            </span>
            <span v-else class="variable-type">
              <pre>{{n.info.toString()}}</pre>
            </span>
          </div>
        </div>
        <div v-else>
          No symbol defined in this context
        </div>
        <div class="nested-context">
          <context-tree 
            v-for="tree in contextTree.children" 
            :key="tree"
            :contextTree="tree"/>
        </div>
      </div>
    </div>
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
  },

})
export default class ContextTree extends Vue {
  @Prop contextTree = p({type: Object})
  open = true;
  isEmpty(object: Object): boolean {
    return Object.keys(object).filter(k => k !== '__ob__').length > 0;
  }
}
</script>

<style scoped>
  .root{
    flex: 2;
    position: relative;
    overflow: hidden;
    max-height: 45px;
    transition: all ease 400ms;
  }
  .root:hover {
    background: rgba(180,230,255,0.1);
  }
  .context-title{
    cursor: pointer;
    height: 45px;
    line-height: 45px;
    background: #eee;
    padding: 0 20px;
    position: relative;
  }
  .variable{
    padding: 5px 0;
    position: relative;
  }
  .stack-offset {
    position: absolute;
    left: -20px;
    top: 5px;
    height: 25px;
    width: 25px;
    line-height: 25px;
    background: #eee;
    text-align: center;
    font-size: 0.8em;
    border-radius: 13px;
    z-index: 10;
  }
  .variable-type{
    display: inline-block;
  }
  pre{
    margin: 0;
    min-width: 65px;
    padding: 0 5px;
    text-align: center;
    border-radius: 5px;
    display: inline-block;
  }
  pre.name {
    background: #fed;
  }
  .context-body{
    position: relative;
    transition: all ease 400ms;
    max-height: 0px;
    overflow-y: auto;
    opacity: 0;
  }
  .context-body-wrapper {
    padding: 0;
    position: relative;
    transition: all ease 400ms;
  }
  .root.open .context-body-wrapper {
    padding: 10px 0 20px 20px;
  }
  .context-body-wrapper::before{
    content: '';
    position: absolute;
    display: block;
    left: 8px;
    top: 0;
    height: 100%;
    z-index: 1;
    border-left: dashed 2px #ccc;
  }
  .root.open{
    max-height: 100vh;
  }
  .root.open .context-body {
    opacity: 1;
    max-height: calc(100% - 45px);
  }
</style>
