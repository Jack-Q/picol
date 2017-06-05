<template>
  <div v-if="nodeType === 'EXPR_BIN'" class="expr-node">
    <div class="expr-node-header">{{getOperatorType(ast.value)}}</div>
    <div>
      <ast-expr :ast="ast.children[0]" />
    </div>
    <div>
      <ast-expr :ast="ast.children[1]" />
    </div>
  </div>
  <div v-else-if="nodeType === 'EXPR_UNI'" class="expr-node">
    <div class="expr-node-header">{{getOperatorType(ast.value)}}</div>
    <ast-expr :ast="ast.children[0]" />
  </div>
  <div v-else-if="nodeType === 'EXPR_ARR_ACCESS'" class="expr-node">
    <div class="expr-node-header">Array: {{ast.children[0].value}}</div>
    <ast-expr :ast="ast.children[0]" />
  </div>
  <div v-else-if="nodeType === 'EXPR_FUNC_INVOKE'" class="expr-node">
    <div class="expr-node-header">Invoke: {{ast.children[0].value}}</div>
    <ast-expr v-for="arg in ast.children[1].children" :ast="arg" />
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_INT'" class="expr-inline-node">
    Integer: <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_FLOAT'" class="expr-inline-node">
    Float Point Number:  <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_CHAR'" class="expr-inline-node">
    Character:  <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_BOOL'" class="expr-inline-node">
    Boolean:  <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_IDENTIFIER'" class="expr-inline-node">
     <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_UNINITIALIZED'" class="expr-inline-node">
    No initialization
  </div>
  <div v-else>
    {{nodeType}}
    {{ast}}
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop } from 'av-ts';
import { ParseNode, ParseNodeType, TokenType, PrimitiveType, ParseOperatorType } from '../../../core/main';

@Component({
  name: 'ast-expr'
})
export default class AstExpr extends Vue {
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
  getOperatorType(type: ParseOperatorType) {
    return ParseOperatorType[type];
  }
}
</script>


<style>
.expr-node{
  padding-left: 55px;
  position: relative;
  font-size: 16px;
  min-height: 55px;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.expr-node + .expr-node {
  border-top: dashed 1px #acf;
}
.expr-node > .expr-node {
  border-left: solid #eee 1px;
}
.expr-node-header{
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
.expr-node pre, .node-block pre{
  display: inline-block;
  font-size: 0.7em;
  padding: 2px;
  margin: 0;
  border: solid #fed 1px;
  background: #fff;
  border-radius: 3px;
}
.expr-inline-node {
  display: inline;
}
</style>
