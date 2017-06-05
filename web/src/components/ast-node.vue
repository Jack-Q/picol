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
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">name</div></div>
      <pre>{{ast.children[0].value}}</pre>
    </div>
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">ret</div></div>
      <ast-node :ast='ast.children[1]' /> 
    </div>
    <div  v-for="(node, i) in ast.children[2].children" class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">par {{i}}</div></div>
      <div class="node-block expr-inline-node">
        <div class="expr-node-header"><div class="type-icon">name</div></div>
        <pre>{{node.children[1].value}}</pre>
      </div>
      <div class="node-block expr-inline-node">
        <div class="expr-node-header"><div class="type-icon">type</div></div>
        <ast-node :ast='node.children[0]' />
      </div>
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
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">type</div></div>
      <ast-node :ast='ast.children[0]' /> 
    </div>
    <div  v-for="dec in ast.children[1].children" class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">decl</div></div>
      <div class="node-block expr-inline-node">
        <div class="expr-node-header"><div class="type-icon">name</div></div>
        <ast-expr :ast='dec.children[0]' />
      </div>
      <div class="node-block expr-inline-node">
        <div class="expr-node-header"><div class="type-icon">value</div></div>
        <ast-expr :ast='dec.children[1]' />
      </div>
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_DECLARATION_ARR_REF'" class='node-block'>
    <div class="node-header">
      <ui-icon>create</ui-icon>
      Array Ref. Def.
    </div>
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">type</div></div>
      <ast-node :ast='ast.children[0].children[0]' /> 
    </div>
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">dim</div></div>
      <pre>{{ast.children[0].value}}</pre> 
    </div>
    <div  v-for="dec in ast.children[1].children" class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">decl</div></div>
      <div class="node-block expr-inline-node">
        <div class="expr-node-header"><div class="type-icon">name</div></div>
        <ast-expr :ast='dec.children[0]' />
      </div>
      <div class="node-block expr-inline-node">
        <div class="expr-node-header"><div class="type-icon">value</div></div>
        <ast-expr :ast='dec.children[1]' />
      </div>
    </div>
  </div>
  <div v-else-if="nodeType === 'STAT_DECLARATION_ARR'" class='node-block'>
    <div class="node-header">
      <ui-icon>create</ui-icon>
      Array Def.
    </div>
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">type</div></div>
      <ast-node :ast='ast.children[0].children[0]' /> 
    </div>
    <div class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">name</div></div>
      <pre> {{ast.children[1].value}} </pre>
    </div>
    <div v-for="(dec, i) in ast.children[0].children[1].children" class="node-block expr-inline-node">
      <div class="expr-node-header"><div class="type-icon">dim {{i}}</div></div>
      <ast-expr :ast='dec' />
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
  <div v-else-if="nodeType === 'STAT_WHILE'" class='node-block'>
    <div class="node-header">
      <ui-icon>loop</ui-icon>
      while loop
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
  <div v-else-if="nodeType === 'STAT_DO'" class='node-block'>
    <div class="node-header">
      <ui-icon>loop</ui-icon>
      do loop
    </div>
    <div class="node-block">
      <div class="node-header"><ui-icon>replay</ui-icon>loop body</div>
      <ast-node v-for="node in ast.children[0].children" :ast='node'></ast-node>
    </div>
    <div class="node-block">
      <div class="node-header"><ui-icon>help_outline</ui-icon>Condition</div>
      <ast-expr :ast='ast.children[1]' />
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
    <pre class="type-prim">&lt;{{getPrimType(ast.value)}}&gt;</pre>
  </span>
  <span v-else-if="nodeType === 'TYPE_ARRAY_REF'">
    <pre class="type-prim">Array&lt;{{getPrimType(ast.children[0].value)}}&gt;[{{ast.value}}]</pre>
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
  font-size: 14px;
  min-height: 55px;
  min-width: 150px;
  transition: all ease 400ms;
}
.node-block:before {
  display: block;
  content: '';
  left: 0;
  top: 0;
  position: absolute;
  height: 0%;
  width: 0;
  transition: all ease 400ms, height ease 1s;
  background: transparent;
}
.node-block:hover {
  background: rgba(180,220,255,0.04);
}
.node-block:hover::before {
  width: 3px;
  height: 100%;
  background: rgb(180,220,255);
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

.node-block pre.type-prim {
  background: #eaeeff;
}
</style>
