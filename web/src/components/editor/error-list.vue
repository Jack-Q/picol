<template>
  <div class="root">
    <div v-if="errorList && errorList.length" class="list">
      <div class="summary">
        <span>{{errorList.length}}</span>
        errors / warnings
      </div>
      <div class="error-list">
        <div v-for="e in errorList" :key="e" class="error-item" :class="getSeverity(e.severity)">
          <div class="severity">
            <ui-icon>{{getIconName(e.severity)}}</ui-icon>
          </div>
          <div class="message">
            <div class="err-src" v-if="e.name !== 'PicolError'">
              {{e.name.replace('Error', '')}}
            </div>
            <div class="pos" v-if="e.pos">
              <span class="pos-line">{{e.pos.startLine}}</span>
              <span class="pos-col">{{e.pos.startCol}}</span>
            </div>
            {{e.message}}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-tip">
      No lexical or syntactic error detected.
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';
import { ErrorSeverity } from '../../../../core/main';

@Component({
  name: 'error-list'
})
export default class ErrorList extends Vue {
  @Prop errorList = p({type: Array})

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
}
</script>

<style scoped>
  .root {
    flex: 0;
    border-left: solid #eee 1px;
    min-width: 350px;
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
    margin: 20px;
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
  }

  .pos-col::before, .pos-line::before {
    font-family: Monaco, Consolas, Courier New, Courier monospace;
    font-weight: 900;
    font-size: 0.9em;
    color: #999;
  }
  .pos-col::before {
    content: 'COL';
  }
  .pos-line::before {
    content: 'LN';
  }
</style>
