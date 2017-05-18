<template>
  <monaco-editor :code="code" :options="editorOptions" srcPath='' width='100%' height='100%' theme='vs'>
  </monaco-editor>
</template>

<script>
import MonacoEditor from 'vue-monaco-editor';

const editorOptions = {
  selectOnLineNumbers: true,
  roundedSelection: true,
  readOnly: false,
  cursorStyle: 'line',
  automaticLayout: true,
  glyphMargin: true,
};

const defaultCodeSnippet =
`// Feel free to explore the World of Picol
int main () {
  // Declare an matrix of matrix
  float[2,2][2,2] a;
  int i = 0, j = 0;
}
`;

export default {
  name: 'hello',
  data() {
    return {
      code: defaultCodeSnippet,
      editorOptions,
    };
  },
  components: {
    MonacoEditor,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
