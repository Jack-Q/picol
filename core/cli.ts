import Main from './main';
import { Token, TokenType } from './token';

const testCode = `// Complete Sample
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

const lexer = Main.lexer(testCode);

const printToken = (tokenIterator: Iterable<Token>): void => {
  for (const token of tokenIterator) {
    // Colorize the error output
    if (token.type === TokenType.INV_NO_MATCH || token.type === TokenType.INV_VALUE) {
      console.error(
        '\x1b[1;35m' + TokenType[token.type], '\t',
        JSON.stringify(token.literal), '\t',
        token.value || '',
        '\x1b[0m',
      );
    } else {
      console.log(TokenType[token.type], '\t', JSON.stringify(token.literal), '\t', token.value || '');
    }
  }
};

const simpleTestCode = `
int a := -20, b, c;
int b := 1000;
123;
+123;
i++;
+ +((i))++;
123 + 123;
123 * 123;
123 + 123 * 123;
b := a + b;
x := y + z || a + (b / 2) * 3 && d + e + f-- - g++;
{
  (a > 12) && c;
  {
    a = 12;
  }
  return 1123;
  break;
  continue;
}
if(a > b && c > d)
  if (c > d)
    int e;
  else
    int f;
while(true){
  i++;
  if(i > 1200){
    break;
  }
}
{}
do i++; while(i < 1000);
switch(i * i + 123){
  case 1: case 2:
    i++; j--;
    break;
  case 3: case 4 * 12:
    i = 123;
    break;
  default:
    break;
}
int funcA(int val, int val2){
  return 123;
}
`;

const simpleLexer = Main.lexer(simpleTestCode);
const tokenList = Array.from(simpleLexer);
printToken(tokenList);
const ast = Main.parser(tokenList);
if (ast) {
  ast.print();
} else {
  console.log('failed to construct AST');
}
