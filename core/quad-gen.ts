import { ParseNode, ParseNodeType } from './parser-node';
import { Quadruple } from './quadruple';

class GeneratorError extends Error {

  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

// tslint:disable-next-line:max-classes-per-file
class ExecutionContext {
  public parent: ExecutionContext;
  public get isRoot(): boolean {
    return parent === undefined;
  }

  constructor(parent: ExecutionContext) {
    this.parent = parent;
  }
}

// tslint:disable-next-line:max-classes-per-file
export class GeneratorContext {
  // the context contains all kinds of
  private contextStack: ExecutionContext[] = [];
  private quadrupleList: Quadruple[] = [];

  public get currentContext(): ExecutionContext {
    return this.contextStack[this.contextStack.length - 1];
  }

  public get quadrupleTable(): Quadruple[] {
    return this.quadrupleList;
  }

  public get nextQuadrupleIndex(): number {
    return this.quadrupleList.length;
  }

  public pushContext() {
    this.contextStack.push(new ExecutionContext(this.currentContext));
    return this.currentContext;
  }
}

interface IGeneratorAttribute {
  isValid: boolean;
}

const attr = {
  valid: (): IGeneratorAttribute => ({ isValid: true }),
};

type generateRule<T extends IGeneratorAttribute> = (ctx: GeneratorContext, node: ParseNode) => T;

const generateSource: generateRule<IGeneratorAttribute> = (ctx, node) => {
  const rootContext = ctx.pushContext();

  return attr.valid();
};

// generate quadruple based on ast
export const generator = (ast: ParseNode) => {
  if (ast.type !== ParseNodeType.SRC_SOURCE) {
    throw new GeneratorError('root of AST for generator must be a source file');
  }
  const ctx = new GeneratorContext();
  const result = generateSource(ctx, ast);
  return ctx.quadrupleTable;
};
