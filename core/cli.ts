import * as fs from 'fs';
import Main from './main';
import { Token, TokenType } from './token';

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

const fileName = process.argv[2];
if (!fileName) {
  console.error('compiling unit is required as parameter');
  process.exit(1);
}
const testCode = fs.readFileSync(fileName).toString();
const lexer = Main.lexer(testCode);
const tokenList = Array.from(lexer);
printToken(tokenList.filter((t) => t.type === TokenType.INV_NO_MATCH || t.type === TokenType.INV_VALUE));
const ast = Main.parser(tokenList);
ast.print();
const quadrupleTable = Main.generator(ast);
quadrupleTable.map((q) => console.log(q));
