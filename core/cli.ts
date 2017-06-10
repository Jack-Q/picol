import * as fs from 'fs';
import Main, { ParseNode, Token, TokenType } from './main';

const printToken = (tokenIterator: Iterable<Token>): void => {
  for (const token of tokenIterator) {
    // Colorize the error output
    if (token.type === TokenType.INV_NO_MATCH || token.type === TokenType.INV_VALUE) {
      console.error(
        '\x1b[1;35m' + TokenType[token.type], '\t',
        JSON.stringify(token.literal), '\t',
        token.value === undefined ? '' : token.value,
        '\x1b[0m',
      );
    } else {
      console.log(TokenType[token.type], '\t', JSON.stringify(token.literal), '\t', token.value || '');
    }
  }
};

const fileName = process.argv[2];
if (!fileName) {
  console.error('compiling unit is required as parameter');
  process.exit(1);
}
const testCode = fs.readFileSync(fileName).toString();
const lexer = Main.lexer(testCode);
const tokenList = Array.from(lexer);

printToken(tokenList);
const parseResult = Main.parser(tokenList);
if (!parseResult.ast) {
  parseResult.errorList.map((err) => console.log(err.message));
  process.exit(1);
}
const ast = parseResult.ast as ParseNode;
ast.print();
const intermediateContext = Main.generator(ast);

intermediateContext.quadrupleList.map((q, i) => console.log(i + '\t', q.toString()));
