import * as chalk from 'chalk';
import * as fs from 'fs';
import Main, { IExecutionParameterProvider, ParseNode, Token, TokenType } from '../main';

const packageConfig = JSON.parse(fs.readFileSync(__dirname + '/../../../package.json').toString());

const banner = [
  chalk.green(':::::::::::::::: Picol ::::::::::::::::'),
  '         \\\\              //  ||        ',
  '           \\\\    ||    //    ||        ',
  '             \\\\  ||  // /``\\ ||        ',
  '        /~====// || \\\\  \\__/ ||        ',
  '        ||  //   <>   \\\\               ',
  chalk.green(':::::::::::::::::::::::::::::::/' + packageConfig.version + '/:'),
].join('\n');

const entryPoints = [
  {
    name: 'Lexer', code: 'L', children: [
      { name: 'Lexical Check', code: '0' },
      { name: 'Token List', code: '1' },
      { name: 'Token Table', code: '2' },
    ],
  },
  {
    name: 'Parser', code: 'P', children: [
      { name: 'Syntactic Check', code: '0' },
      { name: 'Abstract Syntax Tree', code: '1' },
    ],
  },
  {
    name: 'Code Generator', code: 'Q', children: [
      { name: 'Semantic Check', code: '0' },
      { name: 'Execution Context', code: '1' },
      { name: 'Quadruple', code: '2' },
    ],
  },
  {
    name: 'Executor', code: 'E', children: [
      {name: 'Execute', code: '0'},
    ],
  },
];

const printEntryMessage = () => entryPoints.map((pv, pi, pa) => [
  // header line
  `  ${pi === pa.length - 1
    ? '`'
    : '|'}- ${pv.name} (${pv.code})`,
  ...pv.children.map((v, i, a) =>
    `  ${
      pi === pa.length - 1 ? '  ' : '| '
    } ${
      i === a.length - 1 ? '`' : '|'
    }- ${v.name} (${pv.code}${v.code})`),
].join('\n')).join('\n');

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

export default (executorName: string, selfName: string, ...arg: string[]) => {
  console.log(banner);
  console.log(printEntryMessage());

  const fileName = process.argv[2];
  if (!fileName) {
    console.error(chalk.red('a compiling unit is required as parameter'));
    process.exit(1);
  }
  const testCode = fs.readFileSync(fileName).toString();
  const lexer = Main.lexer(testCode);
  const tokenList = Array.from(lexer);

  // printToken(tokenList);
  const parseResult = Main.parser(tokenList);
  if (!parseResult.ast) {
    parseResult.errorList.map((err) => console.log(err.message));
    process.exit(1);
  }
  const ast = parseResult.ast as ParseNode;
  // ast.print();
  const intermediateContext = Main.generator(ast);

  // intermediateContext.quadrupleList.map((q, i) => console.log(i + '\t', q.toString()));
};
