<template>
  <div class="root" v-if="contextTree" :class="{open: open}">
    <div ref="context-title" class="context-title" @click="open = !open">
      <ui-ripple-ink trigger="context-title"></ui-ripple-ink>
      <div v-if="contextTree.name" class="context-title-text">
        {{contextTree.name}}
      </div>
      <div v-else class="context-title-text">
        <i>unnamed</i>
      </div>
      <div class="context-title-actions">
        <div class="context-title-action" ref="title-action-save" @click.stop="saveContext">
          <ui-tooltip trigger="title-action-save"> dump current portion of context to file</ui-tooltip>
          <i class="material-icons">save</i>
        </div>
        <div class="context-title-action" ref="title-action-hide" :class="{on: hideVariable}" @click.stop="hideVariable = ! hideVariable">
          <ui-tooltip trigger="title-action-hide">{{ hideVariable ? "show" : "hide"}} symbols in this context</ui-tooltip>
          <i class="material-icons">low_priority</i>
        </div>
      </div>
    </div>
    <div class="context-body">
      <div class="context-body-wrapper">
        <!-- tree node of current context -->
        <div v-if="isEmpty(contextTree.nameTable)" class="variable-list" :class="{hide: hideVariable}">
          <div v-for="(n,i) in contextTree.nameTable" class="variable" :key="i">
            <pre class="name">{{i}}</pre>
            <pre v-if="i && i[0] === '?'" class="gen">Generated</pre>
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
              <pre>{{n.info.toString()}}</pre> function, entry at: {{n.info.entryAddress}}{{n.info.entryAddress
              < 0 ? ', defined by language' : ''}} </span>
                <span v-else class="variable-type">
                  <pre>{{n.info.toString()}}</pre>
                </span>
          </div>
        </div>
        <div v-else>
          No symbol defined in this context
        </div>
        <!-- nested context -->
        <div class="nested-context">
          <context-tree v-for="(tree, i) in contextTree.children" :key="i" :contextTree="tree" />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="tip">
    No context
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { Quadruple, ExecutionContext } from '../../../../core/main';

@Component({
  name: 'context-tree',
  components: {
  },
})
export default class ContextTree extends Vue {
  @Prop contextTree = p({ type: Object })
  @Prop isRoot = p({ type: Boolean })
  hideVariable = !!this.isRoot;
  open = true;
  isEmpty(object: Object): boolean {
    return Object.keys(object).filter(k => k !== '__ob__').length > 0;
  }
  saveContext(): void {
    if (!this.contextTree) {
      return;
    }
    const content = (this.contextTree as ExecutionContext).dump(2);
    const helperElement = document.createElement('a');
    helperElement.download = 'context.txt';
    helperElement.href = window.URL.createObjectURL(new Blob([content], {
      type: 'octet/stream',
    }));
    helperElement.click();
  }
}
</script>

<style scoped>
.root {
  flex: 2;
  position: relative;
  overflow: hidden;
  max-height: 45px;
  transition: all ease 400ms;
}

.root:hover {
  background: rgba(180, 230, 255, 0.1);
}

.context-title {
  cursor: pointer;
  min-height: 45px;
  height: 45px;
  line-height: 45px;
  background: #eee;
  padding: 0 20px;
  position: relative;
  display: flex;
}

.context-title-text {
  flex: 1;
}

.context-title-actions {
  padding: 0 30px;
}

.context-title-action {
  display: inline-block;
  height: 45px;
  min-width: 45px;
  text-align: center;
  line-height: 45px;
  position: relative;
  background: rgba(255, 255, 255, 0);
  transition: all ease 400ms;
  cursor: pointer;
  z-index: 10;
}

.context-title-action.on {
  background: #ccc;
}

.context-title-action i {
  line-height: 45px;
}

.variable-list {
  position: relative;
  transition: all ease 400ms;
  max-height: 3000px;
}

.variable-list::after {
  position: absolute;
  top: 0;
  line-height: 45px;
  left: 30px;
  content: '(symbols defined in this scope)';
  display: block;
  opacity: 0;
  z-index: -1;
  transition: all ease 400ms;
  font-style: italic;
}

.variable-list.hide {
  padding: 0;
  overflow: hidden;
  max-height: 45px;
}

.variable-list.hide>div {
  opacity: 0.3;
  filter: blur(2px);
}

.variable-list.hide::after {
  opacity: 1;
  z-index: 1;
}

.variable {
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
  transition: all ease 400ms;
}

.variable-list.hide .stack-offset{
  opacity: 0;
}

.variable-type {
  display: inline-block;
}

pre {
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

pre.gen {
  background: #cfd;
  border-radius: 2px;
  font-size: 0.8em;
}

.context-body {
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

.context-body-wrapper::before {
  content: '';
  position: absolute;
  display: block;
  left: 8px;
  top: 0;
  height: 100%;
  z-index: 1;
  border-left: dashed 2px #ccc;
}

.root.open {
  max-height: 100vh;
}

.root.open .context-body {
  opacity: 1;
  max-height: calc(100% - 45px);
}

.tip {
  text-align: center;
  font-size: 1.5em;
  color: #ccc;
  height: 100%;
}
</style>
