<template>
  <div v-if="nodeType === 'SRC_SOURCE'" class='node-block'>
    <div class="node-header">
      <ui-icon>code</ui-icon>
      Src Root
    </div>
    <ast-node v-for="node in ast.children" :ast='node'></ast-node>
  </div>
  <div v-else-if="nodeType === 'STAT_SEQUENCE'" class='node-block'>
    <div class="node-header">
      <ui-icon>list</ui-icon>
      statement list
    </div>
    <ast-node v-for="node in ast.children" :ast='node'></ast-node>
  </div>
  <div v-else-if="nodeType === 'STAT_FUNCTION'" class='node-block'>
    <div class="node-header">
      <ui-icon>functions</ui-icon>
      Func Def.
    </div>
    <div>
      Function Name: {{ast.children[0].value}}
    </div>
    <div>
      Return Type: <ast-node :ast='ast.children[1]' /> 
    </div>
    <div  v-for="(node, i) in ast.children[2].children">
      Argument {{i + 1}}: <ast-expr :ast="node.children[1]" />

      <ast-node :ast='node.children[0]' />
    </div>
    <div class="node-block">
      <div class="node-header">Body</div>
      <ast-node v-for="node in ast.children[3].children" :ast='node'></ast-node>
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_DECLARATION_PRIM'" class='node-block'>
    <div class="node-header">
      <ui-icon>create</ui-icon>
      Var Def.
    </div>
    <div>
      Value Type: {{ast.children[0].value}}
    </div>
    <div v-for="dec in ast.children[1].children">
      Decl: {{dec.children[0].value}}
      <ast-expr :ast='dec.children[1]' /> 
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_IF' || nodeType === 'STAT_IF_ELSE'" class='node-block'>
    <div class="node-header">
      <ui-icon>call_split</ui-icon>
      if
    </div>
    <div class="node-block">
      <div class="node-header"><ui-icon>help_outline</ui-icon>Condition</div>
      <ast-expr :ast='ast.children[0]' />
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
    <div class="node-block">
      <div class="node-header"><ui-icon>help_outline</ui-icon>Condition</div>
      <ast-expr :ast='ast.children[0]' />
    </div>
    <div class="node-block">
      <div class="node-header"><ui-icon>replay</ui-icon>loop body</div>
      <ast-node v-for="node in ast.children[1].children" :ast='node'></ast-node>
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_EXPR'" class="node-block">
    <div class="node-header">
      <ui-icon>widgets</ui-icon>
      Expr
    </div>
    <ast-expr :ast="ast.children[0]" />
  </div>
  <div v-else-if="nodeType === 'STAT_RETURN'" class="node-block">
    <div class="node-header">
      <ui-icon>keyboard_return</ui-icon>
      Return
    </div>
    <ast-expr :ast="ast.children[0]" />
  </div>
  <div v-else-if="nodeType === 'STAT_BREAK'" class="node-block">
    <div class="node-header">
      <ui-icon>vertical_align_bottom</ui-icon>
      Break
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_CONTINUE'" class="node-block">
    <div class="node-header">
      <ui-icon>last_page</ui-icon>
      Continue
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
import AstExpr from './ast-expr';

@Component({
  name: 'ast-node',
  components: {
    AstExpr,
  },
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
  min-height: 55px;
  min-width: 150px;
}

.node-block + .node-block {
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
