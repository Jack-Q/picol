<template>
  <div class="root">
    <div v-if="tokenList && tokenList.length" class="list">
      <div class="summary">
        <span>{{tokenList.length}}</span> tokens
      </div>
      <div class="filter">
        <div :class="{on: filter === ''}" @click="filter=''">ALL</div>
        <div :class="{on: filter === 'no-space'}" @click="filter='no-space'">No Space</div>
      </div>
      <div class="token-list">
        <div v-for="(t, i) in getFilteredList()" :key="i" class="token-item">
          <span class="token-index">{{i}}</span>
          <span class="token-type">
            <code>{{getType(t.type)}}</code>
          </span>
          <span class="token-pos" @click="selectPosition(t.position)">
            <span class="pos-line">{{t.position.startLine}}</span>
            <span class="pos-col">{{t.position.startCol}}</span>
          </span>
          <span class="token-value" :title="t.value">{{t.value}}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty-tip">
      <div class="empty-icon">
        <i class="material-icons">hourglass_empty</i>
      </div>
      no token found
      <div style="font-size: 0.7em">
        try to add some code first?
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';
import { TokenType, Token, TokenTypeUtil, RangePosition } from '../../../../core/main';

@Component({
  name: 'token-list'
})
export default class TokenList extends Vue {
  @Prop tokenList = p({type: Array})

  filter=''

  selectPosition(pos: RangePosition) {
    this.$emit('selectPosition', pos);
  }

  getFilteredList(): Token[] {
    let filterFunc;
    switch(this.filter) {
      case 'no-space':
        filterFunc = (t: Token) => !TokenTypeUtil.isWhiteSpace(t.type);
        break;
      default:
        return this.tokenList || [];
    }
    return this.tokenList && this.tokenList.filter ? this.tokenList.filter(filterFunc) : [];
  }

  getType(t: TokenType) {
    return TokenType[t];
  }
}
</script>

<style scoped>
  .root {
    flex: 0;
    border-left: solid #eee 1px;
    min-width: 400px;
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .empty-tip{
    text-align: center;
    font-size: 2em;
    color: #cccccc;
    height: 100%;
    margin: auto 20px;
  }

  .empty-icon {
    padding: 20px auto;
  }

  .empty-icon > i {
    font-size: 64px;
  }

  .summary {
    height: 45px;
    background: #eee;
    line-height: 45px;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;
    color: #555;
  }
  .summary span {
    color: #f85;
  }

  .filter {
    display: flex;
    min-height: 35px;
  }
  .filter > div {
    flex: 1;
    text-align: center;
    margin: auto;
    height: 35px;
    line-height: 35px;
    cursor: pointer;
    background: #eee;
    transition: all ease 400ms;
  }
  .filter > div.on {
    background: #fff;
  }

  .token-list {
    overflow-y: auto;
    flex: 1;
  }
  .token-item {
    display: flex;
    line-height: 30px;
    align-items: center;
  }
  .token-item + .token-item {
    border-top: solid 1px #eee;
  }

  .token-index {
    width: 10%;
    text-align: center;
    font-size: 0.9;
  }
  
  .token-type{
    width: 45%;
    text-align: center;
    font-size: 0.8em;
  }

  .token-pos {
    display: inline-block;
    border-radius: 5px;
    padding: 0 5px;
    height: 22px;
    line-height: 22px;
    font-size: 16px;
    width: 25%;
    background: #ecd;
    cursor: pointer;
  }

  .token-value {
    width: 20%;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: keep-all;
  }

  .pos-col::before, .pos-line::before {
    font-family: Monaco, Consolas, Courier New, Courier monospace;
    font-weight: 900;
    font-size: 0.9em;
    color: #999;
    cursor: pointer;
  }
  .pos-col::before {
    content: 'COL';
    cursor: pointer;
  }
  .pos-line::before {
    content: 'LN';
    cursor: pointer;
  }
</style>
