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
}
`;

const picolSample: {
  default: string;
  [sampleName: string]: string;
} = {
  default: completeSample,
  defaultSample,
  completeSample,
};

export default picolSample;
