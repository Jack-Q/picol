<template>
  <div class="root">
    <div v-if="errorList && errorList.length" class="list">
      <div class="summary">
        <span>{{errorList.length}}</span>
        errors / warnings
      </div>
      <div class="filter">
        <div :class="{on: filter === ''}" @click="filter=''">ALL</div>
        <div :class="{on: filter === 'lex'}" @click="filter='lex'">Lex</div>
        <div :class="{on: filter === 'par'}" @click="filter='par'">Par</div>
        <div :class="{on: filter === 'gen'}" @click="filter='gen'">Gen</div>
      </div>
      <div class="error-list">
        <div v-for="e in errorList.filter(e => e.name.toLowerCase().indexOf(filter) >= 0)" :key="errorList.indexOf(e)" class="error-item" :class="getSeverity(e.severity)">
          <div class="severity">
            <ui-icon>{{getIconName(e.severity)}}</ui-icon>
          </div>
          <div class="message">
            <div class="err-src" v-if="e.name !== 'PicolError'">
              {{e.name.replace('Error', '')}}
            </div>
            <div class="pos" v-if="e.pos" @click="selectPosition(e.pos)">
              <span class="pos-line">{{e.pos.startLine}}</span>
              <span class="pos-col">{{e.pos.startCol}}</span>
            </div>
            <span v-if="e.interpolatedMessage">
              
            </span>
            <span v-else>
              {{e.message}}
            </span>
          </div>
        </div>
        <div v-if="errorList.filter(e => e.name.toLowerCase().indexOf(filter) >= 0).length === 0" class="empty-tip">
          <div class="empty-icon">
            <i class="material-icons">check_circle</i>
          </div>
          No error found in this pass
        </div>
      </div>
    </div>
    <div v-else class="empty-tip">
      <div class="empty-icon">
        <i class="material-icons">check_circle</i>
      </div>
      No lexical or syntactic error detected.
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';
import { ErrorSeverity, RangePosition } from '../../../../core/main';

@Component({
  name: 'error-list'
})
export default class ErrorList extends Vue {
  @Prop errorList = p({type: Array})

  filter=''

  getSeverity(severity: ErrorSeverity): string{
    return ErrorSeverity[severity];
  }
  getIconName(severity: ErrorSeverity): string {
    const iconMap: {[name:string]: string} = {
      INFO: 'info',
      WARN: 'warning',
      ERROR: 'error',
      FATAL: 'block',
    }
    return iconMap[this.getSeverity(severity)];
  }
  selectPosition(pos: RangePosition) {
    this.$emit('selectPosition', pos);
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

  .error-list {
    overflow-y: auto;
    flex: 1;
  }
  .error-item {
    display: flex;
    line-height: 30px;
    align-items: center;
  }
  .error-item + .error-item {
    border-top: solid 1px #eee;
  }
  .severity {
    flex: 0;
    min-width: 40px;
    height: 30px;
    text-align: center;
  }
  .INFO .severity {
    color: #cec;
  }
  .WARN .severity {
    color: #ec5;
  }
  .ERROR .severity {
    color: #f55;
  }
  .FATAL .severity {
    color: #f00;
  }
  .message {
    flex: 1;
    font-size: 0.9em;
  }

  .err-src, .pos {
    display: inline-block;
    border-radius: 5px;
    padding: 0 5px;
    height: 22px;
    line-height: 22px;
    font-size: 16px;
  }

  .err-src {
    background: #aef;
  }

  .pos {
    background: #ecd;
    cursor: pointer;
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
