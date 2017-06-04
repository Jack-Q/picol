<template>
  <div v-if="nodeType === 'SRC_SOURCE'" class='node-block'>
    <div class="node-header">
      <ui-icon>code</ui-icon>
      source root
    </div>
    <ast-node v-for="node in ast.children" :ast='node'></ast-node>
  </div>
  <div v-else-if="nodeType === 'STAT_FUNCTION'" class='node-block'>
    <div class="node-header">
      <ui-icon>functions</ui-icon>
      function definition
    </div>
    <div>
      Function Name: {{ast.children[0].value}}
    </div>
    <div>
      Return Type: <ast-node :ast='ast.children[1]' /> 
    </div>
    <div  v-for="(node, i) in ast.children[2].children">
      Argument {{i + 1}} <ast-node :ast='node' />
    </div>
    <div class="node-block">
      <div class="node-header">Body</div>
      <ast-node v-for="node in ast.children[3].children" :ast='node'></ast-node>
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_DECLARATION_PRIM'" class='node-block'>
    <div class="node-header">
      <ui-icon>create</ui-icon>
      variable definition
    </div>
    <div>
      Value Type: {{ast.children[0].value}}
    </div>
    <div v-for="dec in ast.children[1].children">
      Decl: {{dec.value}}
      <ast-node :ast='dec.children[1]' /> 
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_IF' || nodeType === 'STAT_IF_ELSE'" class='node-block'>
    <div class="node-header">
      <ui-icon>call_split</ui-icon>
      if
    </div>
    <div>
      Condition: <ast-node :ast='ast.children[0]' /> 
    </div>
    <div class="node-block">
      <div class="node-header"><ui-icon>done</ui-icon>Then</div>
      <ast-node v-for="node in ast.children[1].children" :ast='node'></ast-node>
    </div>

    <div v-if="ast.children[2]" class="node-block">
      <div class="node-header"><ui-icon>clear</ui-icon>Else</div>
      <ast-node v-for="node in ast.children[2].children" :ast='node'></ast-node>
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_WHILE' || nodeType === 'STAT_DO'" class='node-block'>
    <div class="node-header">
      <ui-icon>loop</ui-icon>
      loop
    </div>
    <div>
      Condition: <ast-node :ast='ast.children[0]' /> 
    </div>
    <div class="node-block">
      <div class="node-header"><ui-icon>replay</ui-icon>loop body</div>
      <ast-node v-for="node in ast.children[1].children" :ast='node'></ast-node>
    </div>
  </div>
  <span v-else-if="nodeType === 'TYPE_PRIMITIVE'">
    {{getPrimType(ast.value)}}
  </span>
  <div v-else>
    type: {{nodeType}}
    {{ast}}
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { ParseNode, ParseNodeType, TokenType, PrimitiveType } from '../../../core/main';

@Component({
  name: 'ast-node'
})
export default class AstNode extends Vue {
  @Prop ast = p({type: Object})

  public get nodeType() {
    const ast = this.ast as ParseNode;
    if(ast && ast.type !== undefined) {
      return ParseNodeType[ast.type];
    } else {
      return "";
    }
  }

  getTokenType(type: TokenType) {
    return TokenType[type];
  }
  getPrimType(type: PrimitiveType) {
    return PrimitiveType[type];
  }
}
</script>

<style>
.node-block {
  padding-left: 55px;
  position: relative;
  font-size: 16px;
}

.node-block  .node-block {
  border-top: dashed 1px #acf;
}
.node-block > .node-block {
  border-left: solid #eee 1px;
}
.node-header{
  position: absolute;
  height: 100%;
  color: #999;
  width: 55px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  left: 0;
}
</style>
