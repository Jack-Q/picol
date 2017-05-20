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

for (const token of lexer) {
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
