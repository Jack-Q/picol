<template>
  <div v-if="nodeType === 'EXPR_BIN'" class="node-block expr-node">
    <div class="expr-node-header">
      <span class='expr-operator'>{{getOperatorType(ast.value)[0]}}</span>
      <span class='expr-operator-text'>{{getOperatorType(ast.value)[1]}}</span>
    </div>
    <ast-expr :ast="ast.children[0]" />
    <ast-expr :ast="ast.children[1]" />
  </div>
  <div v-else-if="nodeType === 'EXPR_UNI'" class="node-block expr-node">
    <div class="expr-node-header">
      <span class='expr-operator'>{{getOperatorType(ast.value)[0]}}</span>
      <span class='expr-operator-text'>{{getOperatorType(ast.value)[1]}}</span>
    </div>
    <ast-expr :ast="ast.children[0]" />
  </div>
  <div v-else-if="nodeType === 'EXPR_ARR_ACCESS'" class="node-block expr-node">
    <div class="expr-node-header">
      <ui-icon>view_comfy</ui-icon>
      <pre>{{ast.children[0].value}}</pre>
    </div>
    <div v-for="(arg, i) in ast.children[1].children" class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">dim {{i}}</div></div>
      <ast-expr :ast="arg" />
    </div>
  </div>
  <div v-else-if="nodeType === 'EXPR_FUNC_INVOKE'" class="node-block expr-node">
    <div class="expr-node-header">
      <ui-icon>call</ui-icon>
      <pre>{{ast.children[0].value}}</pre>
    </div>
    <div v-for="(arg, i) in ast.children[1].children" class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">arg {{i}}</div></div>
      <ast-expr :ast="arg" />
    </div>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_INT'" class="node-block expr-inline-node">
    <div class="expr-node-header"><div class="type-icon">int</div></div>
    <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_FLOAT'" class="node-block expr-inline-node">
    <div class="expr-node-header"><div class="type-icon">float</div></div>
    <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_CHAR'" class="node-block expr-inline-node">
    <div class="expr-node-header"><div class="type-icon">char</div></div>
    <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_CONSTANT_BOOL'" class="node-block expr-inline-node">
    <div class="expr-node-header"><div class="type-icon">bool</div></div>
    <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_IDENTIFIER'" class="node-block expr-inline-node">
    <div class="expr-node-header"><div class="type-icon">id</div></div>
    <pre>{{ast.value}}</pre>
  </div>
  <div v-else-if="nodeType === 'VAL_UNINITIALIZED'" class="node-block expr-inline-node">
    <div class="expr-node-header"><div class="type-icon">un-init</div></div>
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
    switch(type){
      case ParseOperatorType.UNI_POSIT: return ['+', 'positive'];    // + a
      case ParseOperatorType.UNI_NOT: return ['\u00ac', 'not'];     // ! a
      case ParseOperatorType.UNI_NEGATE: return ['-', 'negative'];   // - a
      case ParseOperatorType.UNI_INC_PRE: return ['++', 'pre inc']; // ++ a
      case ParseOperatorType.UNI_DEC_PRE: return ['--', 'pre dec']; // -- a
      case ParseOperatorType.UNI_INC_POS: return ['++', 'post inc']; // a ++
      case ParseOperatorType.UNI_DEC_POS: return ['--', 'post dec']; // a --

      case ParseOperatorType.BIN_ADD: return ['+', 'add'];     // a + b
      case ParseOperatorType.BIN_SUB: return ['-', 'minus'];     // a - b
      case ParseOperatorType.BIN_MULTI: return ['\u00d7', 'mul'];   // a * b
      case ParseOperatorType.BIN_DIVIDE: return ['\u00f7', 'div'];  // a / b
      case ParseOperatorType.BIN_REL_GT: return ['>', 'gt'];  // a > b
      case ParseOperatorType.BIN_REL_GTE: return ['\u2265', 'gte']; // a >= b
      case ParseOperatorType.BIN_REL_EQ: return ['=', 'equal'];  // a = b
      case ParseOperatorType.BIN_REL_NE: return ['\u2260', 'neq'];  // a != b
      case ParseOperatorType.BIN_REL_LT: return ['<', 'lt'];  // a < b
      case ParseOperatorType.BIN_REL_LTE: return ['\u2264', 'lte']; // a <= b
      case ParseOperatorType.BIN_LOG_AND: return ['\u2227', 'and']; // a && b
      case ParseOperatorType.BIN_LOG_OR: return ['\u2228', 'or'];  // a || b (logic or)
      case ParseOperatorType.BIN_ASS_VAL: return ['\u2254', 'assign']; // a := b
      case ParseOperatorType.BIN_ASS_ADD: return ['+', 'add & ass']; // a += b
      case ParseOperatorType.BIN_ASS_SUB: return ['-', 'minus & ass']; // a -= b
      case ParseOperatorType.BIN_ASS_MUL: return ['\u00d7', 'mul & ass']; // a *= b
      case ParseOperatorType.BIN_ASS_DIV: return ['\u00f7', 'div & ass']; // a /= b
    }
    return ['?', ParseOperatorType[type]];
  }
}
</script>


<style>
.expr-node{
  font-size: 14px;
  display: flex;
  flex-direction: column;
}
.expr-node > div {
  margin-top: auto;
  margin-bottom: auto;
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
  width: auto;
  border: solid #fed 1px;
  background: #fff;
  border-radius: 3px;
}
.expr-inline-node {
  display: inline;
  min-height: 25px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}
.type-icon{
  font-weight: 800;
  text-transform: uppercase;
  border: solid 2px #999;
  border-radius: 5px;
  padding: 0 3px;
  text-align: center;
  min-width: 35px;
  font-size: 12px;
  margin: auto;
}
.expr-operator {
  display: block;
  margin: 0;
  font-weight: 800;
  border: solid 2px #999;
  border-radius: 11px;
  width: 22px;
  height: 22px;
  line-height: 18px;
  text-align: center;
  font-size: 12px;
}
</style>
