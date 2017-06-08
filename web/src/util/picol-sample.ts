const defaultSample =  `// Default Sample
// Feel free to explore the World of Picol
int main (int v1, int v2) {
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
}

main(1, 2);
`;

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

const stackSample = `// various definitions
int a, b, c, d;
bool e, f, g, h;
char i, j, k, l;
int[1,2] a_1;
int[2,3] a_2;
{
    int a, b, c, d;
    int e, f, g, h;
}
int funct(){
    int a, b, c, d;
    int e, f, g, h;
    {
        int a, b, c, d;
        int e, f, g, h;
    }
}
`;

const fact = `// recursive factorial calculation
int b;

int fact(int a){
    if(a == 0){
        return 1;
    }
    return a * fact(a - 1);
}

b := fact(10);
`;

const picolSample: {
  default: string;
  [sampleName: string]: string;
} = {
  default: defaultSample,
  defaultSample,
  completeSample,
  functionSample,
  stackSample,
  fact,
};

export default picolSample;
