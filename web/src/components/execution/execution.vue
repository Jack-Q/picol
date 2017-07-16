<template>
  <div class="executor-root" v-if="program">
    <div class="col statue-col">
      <div class="section">status</div>
      <dl>
        <dt>PC</dt>
        <dd>
          {{executor.pc}}
          <span v-if="getBuildInFunc()">
            <code ref="buildin-tip" class="build-in-tip">
              {{getBuildInFunc().name}}
              <ui-tooltip trigger="buildin-tip">Build-in function: {{getBuildInFunc().description}}</ui-tooltip>
            </code>
          </span>
        </dd>
        <dt>Frame Base</dt>
        <dd>{{executor.frameBase}}</dd>
      </dl>
      <div class="section">control</div>
      <div class="control">
        <ui-button @click="step">Step</ui-button>
        <ui-button @click="reset">Reset</ui-button>
        <ui-button @click="executor.console = []">Clear Console</ui-button>
        <div class="auto-execution-block">
          <ui-switch switchPosition="right" :value="autoExecute" @input="toggleAutoExecute($event)">Auto Execute</ui-switch>
          Speed: <ui-slider ref="slider" icon="play" v-model="speed" :step='10' showMarker snapToSteps :markerValue='calcSpeed'>Speed</ui-slider>
        </div>
      </div>
      <div class="section">console</div>
      <div class="console">
        <template v-for="err in executor.console.map(i => i).reverse()">
          <div v-if="getSeverity(err.severity) === 'INFO'" class="info info-message">
            <div class="icon">
              <ui-icon>info</ui-icon>
            </div>
            {{err.message}}
          </div>
          <div v-else-if="getSeverity(err.severity) === 'WARN'" class="info info-warning">
            <div class="icon">
              <ui-icon>warning</ui-icon>
            </div>
            <div class="message">{{err.message}}</div>
          </div>
          <div v-else-if="getSeverity(err.severity) === 'ERROR'" class="info info-error">
            <div class="icon">
              <ui-icon>error</ui-icon>
            </div>
            <div class="message">{{err.message}}</div>
          </div>
          <div v-else-if="getSeverity(err.severity) === 'FATAL'" class="info info-fatal">
            <div class="icon">
              <ui-icon>block</ui-icon>
            </div>
            <div class="message">{{err.message}}</div>
          </div>
          <div v-else>
            {{getSeverity(err.severity)}}
            {{err.severity}}
            <div class="message">{{err.message}}</div>
          </div>
        </template>
      </div>
    </div>
    <div class="col">
      <ui-tabs>
        <ui-tab title="temp">
          <memory-view :memoryData='executor.temp'></memory-view>
        </ui-tab>
        <ui-tab title="stack">
          <memory-view :memoryData='executor.stack'></memory-view>
        </ui-tab>
        <ui-tab title="heap">
          <memory-view :memoryData='executor.heap'></memory-view>
        </ui-tab>
      </ui-tabs>
    </div>
    <div class="program">
      <quad-viewer :quadList="program" :highlight="executor.pc"></quad-viewer>
    </div>
  </div>
  <div v-else>
    No context
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';
import { Quadruple, Executor, ErrorSeverity, buildInFunctions } from '../../../../core/main';

import QuadViewer from '../intermediate/quad-viewer';
import MemoryView from './memory-view';

@Component({
  name: 'execution',
  components: {
    QuadViewer,
    MemoryView,
  },
})
export default class Execution extends Vue {
  @Prop program = p({type: Array})

  autoExecute: boolean = false;
  speed: number = 0;
  get calcSpeed () {
    return (Math.round((100 - this.speed) / 10) || 1) / 10;
  }

  executor: Executor = new Executor();
  autoExecuteHandle = 0;

  @Lifecycle beforeUpdate(){
    const program = this.program as Quadruple[];
    if(!this.executor){
      this.executor = new Executor(program);
    }
    if(this.executor.program !== this.program){
      this.executor.load(program);
    }
    (this.$refs['slider'] as any).refreshSize();
  }

  toggleAutoExecute(autoExecute: boolean){
    if(this.autoExecute === autoExecute){
      return;
    }
    this.autoExecute = autoExecute;
    if(autoExecute){
      this.autoExecuteCallback();
    }else{
      clearTimeout(this.autoExecuteHandle);
      this.autoExecuteHandle = 0;
    }
  }

  autoExecuteCallback(){
    this.executor.step();
    this.autoExecuteHandle = setTimeout(() => this.autoExecuteCallback(), 1000 * this.calcSpeed);
  }

  step() {
    this.toggleAutoExecute(false);
    this.executor.step();
  }

  reset() {
    this.toggleAutoExecute(false);
    this.executor.reset();
  }

  getSeverity(severity: ErrorSeverity): string{
    return ErrorSeverity[severity];
  }

  getBuildInFunc() {
    return this.executor.pc < 0 ? buildInFunctions.find(f => f.id === this.executor.pc) : false;
  }
}
</script>

<style scoped>
  .executor-root{
    flex: 1;
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  pre{
    overflow-x: auto;
    height: 100%;
    width: 100%;
    margin: 0;
    font-size: 12px;
    overflow: auto;
  }
  .col {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .auto-execution-block{
    display: block;
    width: 100%;
    position: relative;
  }
  .control {
    text-align: center;
    padding: 5px 20px;
  }
  .console{
    overflow-y: auto;
    font-size: 0.9em;
    line-height: 25px;
  }
  .program{
    min-width: 280px;
    flex: 1;
    position: relative;
  }

  .program > div {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .section {
    text-align: center;
    background: #eee;
    height: 45px;
    line-height: 45px;
    font-weight: 500;
    text-transform: uppercase;
  }

  dl{
    text-align: center;
    margin: 0;
    padding: 0;
  }

  dt{
    margin: 0 0 4px 0;
    float: left;
    clear: left;
    width: 35%;
  }

  dd{
    float: left;
    width: 64%;
    margin: 0 0 4px 1%;
  }
  .info {
    display: flex;
    width: 100%;
  }
  .icon{
    text-align: center;
    min-width: 60px;
    flex: 0;
  }
  .message{
    text-align: left;
    flex: 1;
    border-left: solid #ccc 1px;
  }
  .build-in-tip{
    font-size: 0.65em;
    padding: 2px 4px;
    background: #ccc;
    border-radius: 3px;
  }
</style>
