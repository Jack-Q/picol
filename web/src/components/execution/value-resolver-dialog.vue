<template>
  <div class="model-wrapper">
    <template v-if="valueType == 'getInt'">
      <div class="model-header">Please provide an integer value</div>
      <div>
        <ui-textbox label="integer value" placeholder="Enter an integer" v-model="intValue" type="number" 
          :min="-Math.pow(2, 15)" :max="Math.pow(2, 15) - 1"></ui-textbox>
      </div>
      <div class="model-button-bar">
        <ui-button @click="submitInt">OK</ui-button>
        <ui-button @click="reset">Cancel &amp; Reset</ui-button>
      </div>
    </template>
    <div v-else-if="valueType == 'getFloat'">
      <div class="model-header">Please provide a float point number</div>
      <div>
        <ui-textbox label="float point value" placeholder="Enter an float point number" v-model="floatValue" type="number"></ui-textbox>
      </div>
      <div class="model-button-bar">
        <ui-button @click="submitFloat">OK</ui-button>
        <ui-button @click="reset">Cancel &amp; Reset</ui-button>
      </div>
    </div>
    <div v-else-if="valueType == 'getChar'">
      <div class="model-header">Please provide a character</div>
      <div>
        <ui-textbox label="character" placeholder="Enter an character" 
          v-model="charValue" type="text" 
          :maxlength="1" :enforceMaxlength="true"></ui-textbox>
      </div>
      <div class="model-button-bar">
        <ui-button @click="submitChar">OK</ui-button>
        <ui-button @click="reset">Cancel &amp; Reset</ui-button>
      </div>
    </div>
    <div v-else-if="valueType == 'getBoolean'">
      <div class="model-header">Please provide an integer value</div>
      <div>
        <div class="boolean-option" :class="{on: boolValue}" @click="boolValue=true"></div>
        <div class="boolean-option" :class="{on: !boolValue}" @click="boolValue=false"></div>
      </div>
      <div class="model-button-bar">
        <ui-button @click="submitBool">OK</ui-button>
        <ui-button @click="reset">Cancel &amp; Reset</ui-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Lifecycle, p, Prop, Watch } from 'av-ts';

@Component({
  name: 'value-resolver-dialog'
})
export default class ValueResolverDialog extends Vue {
  @Prop valueType = p({ type: String, required: true })

  charValue: string;
  intValue: number;
  floatNumber: number;
  boolValue: boolean;

  resetValue() {
    this.charValue="";
    this.intValue = 0;
    this.floatNumber = 0;
    this.boolValue = false;
  }

  submitChar() {
    this.submit(this.charValue);
  }

  submitInt() {
    this.submit(this.intValue);
  }

  submitFloat() {
    this.submit(this.floatNumber);
  }

  submitBool() {
    this.submit(this.boolValue);
  }

  private submit(value: string | boolean | number) {
    this.$emit('submitValue', value);
  }

  reset() {
    this.resetValue();
    this.$emit('reset');
  }
}
</script>

<style scoped>
.model-wrapper {
  margin: auto;
  max-width: 450px;
  max-height: 300px;
  flex: 1;
  background-color: #eee;
  border-radius: 2px;
  box-shadow: 0 0 10px 1px #ddd;
}
.model-wrapper > div {
  padding: 20px 20px;
}
.model-header {
  text-align: center;
  font-size: 1.3em;
}
.model-button-bar {
  border-top: dashed 3px #ccc;
  text-align: center;
}

</style>
