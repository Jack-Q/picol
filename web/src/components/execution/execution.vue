<template>
  <div class="executor-root" v-if="program">
    <div class="col statue-col">
      PC: {{executor.pc}}
      <div>
        <ui-button @click="step">Step</ui-button>
        <ui-button @click="reset">Reset</ui-button>
        <ui-button @click="executor.console = []">Clear Console</ui-button>
        <div class="auto-execution-block">
          <ui-switch switchPosition="right" :value="autoExecute" @input="toggleAutoExecute($event)">Auto Execute</ui-switch>
          <ui-slider ref="slider" icon="play" v-model="speed" :step='10' showMarker snapToSteps :markerValue='calcSpeed'>Speed</ui-slider>
        </div>
      </div>
      console
      <div class="console">
        <div v-for="err in executor.console">
          {{err.severity}}
          {{err.message}}
        </div>
      </div>
    </div>
    <div class="col temp-col">
      Temp
      {{executor.temp}}
    </div>
    <div class="col stack-col">
      Stack
      {{executor.stack}}
    </div>
    <div class="col heap-col">
      Heap
      {{executor.heap}}
    </div>
    <div class="program">
      <quad-viewer :quadList="program" />
    </div>
  </div>
  <div v-else>
    No context
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';
import { Quadruple, Executor } from '../../../../core/main';

import QuadViewer from '../intermediate/quad-viewer';

@Component({
  name: 'execution',
  components: {
    QuadViewer,
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
    this.step();
    this.autoExecuteHandle = setTimeout(() => this.autoExecuteCallback(), 1000 * this.calcSpeed);
  }

  step() {
    this.executor.step();
  }

  reset() {
    this.executor.reset();
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
  .console{
    overflow-y: auto;
  }
</style>
