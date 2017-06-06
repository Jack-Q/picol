const defaultSample =  `// Default Sample
// Feel free to explore the World of Picol
int main () {
  // Declare an matrix of matrix
  float[2,2][2,2] a;
  int i := 0, j := 100;
  bool test := true;
  while (i < j || test) {
    i++;
    j--;
    if ( j - i > 2 * j && test) {
      j := j + i;
    }
  }
}`;

const completeSample = `// Complete Sample
// This sample tries to cover every language features in one file

// Function Declaration
int square(int value){
  // single expression
  value++;

  // return expression
  return value * value;
}

int main(){
  // Declaration
  float number := 3.0, result;

  // Assignment, invocation, type-elevation
  result := square(square(number));

  if ( result > 10 ) {
    while ( result > 10 ) {
      result--;
      if( result > 10 ){
        show('C');
        continue;
      }else{
        show('\\t'); // escape character
        show('F');
        show('\\n');
        break;
      }
      show('U');
    }
  } else {
    show('E');
  }
  return 123;
  return;
}

int[10,10,10] arr;
int i,j;
switch(arr[1,2,3]){
  case 12: i++; break;
  case 13: j++; break;
  default: i *= j; break;
}

`;

const functionSample = `// Sample file with nested function definition
int a := 12;
int b := 24;
int[10,a,b] arr;
int[,,,] arrRef := arr;

void main(){
  void show() {}

  while(a < b) {
    void func(int a, int b) {
      show(a);
      show(b);
    }
    func(a++, b--);
  }

  int a, b;
}

main();
`;

const picolSample: {
  default: string;
  [sampleName: string]: string;
} = {
  default: completeSample,
  defaultSample,
  completeSample,
  functionSample,
};

export default picolSample;
