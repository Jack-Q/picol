import { ParseNode, ParseNodeType } from './parser-node';
import { Quadruple, QuadrupleArgumentQuadRef, QuadrupleArgument, QuadrupleArgumentValue, QuadrupleOperator, QuadrupleArgumentTableRef, QuadrupleArgumentNull } from './quadruple';
import { PrimitiveType } from './token';

class GeneratorError extends Error {

  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

class ExecutionContext {
  public parent: ExecutionContext;
  private nameTable: { [name: string]: { name: string } } = {}
  public get isRoot(): boolean {
    return parent === undefined;
  }

  constructor(parent: ExecutionContext) {
    this.parent = parent;
  }
  
  public addEntry (name: string){
    this.nameTable[name] = { name };
  }
}

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

  public addEntry(name: string) {
    this.currentContext.addEntry(name);
  }

  public addQuadruple(op: QuadrupleOperator, arg1: QuadrupleArgument, arg2: QuadrupleArgument, result: QuadrupleArgument, comment: string = '') {
    const quadruple = new Quadruple();
    quadruple.operator = op;
    quadruple.argument1 = arg1;
    quadruple.argument2 = arg2;
    quadruple.result = result;
    quadruple.comment = comment;
    this.quadrupleList.push(quadruple);
  }
}

interface IGeneratorAttribute {
  isValid: boolean;
}

class GeneratorAttributeStatement implements IGeneratorAttribute {
  isValid = true;
  chain: QuadrupleArgumentQuadRef;
  constructor(chain: QuadrupleArgumentQuadRef) {
    this.chain = chain;
  }
}

class GeneratorAttributeExpression implements IGeneratorAttribute {
  isValid = true;
  value: QuadrupleArgument;
  constructor(value: QuadrupleArgument) {
    this.value = value;
  }
}

const attr = {
  valid: (): IGeneratorAttribute => ({ isValid: true }),
};

type generateRule<T extends IGeneratorAttribute> = (ctx: GeneratorContext, node: ParseNode) => T;

const generateExpression: generateRule<GeneratorAttributeExpression> = (ctx, node) => {
  switch (node.type) {
    case ParseNodeType.VAL_CONSTANT_INT:
    case ParseNodeType.VAL_UNINITIALIZED:
    case ParseNodeType.EXPR_BIN:
    case ParseNodeType.EXPR_ARR_ACCESS:
    case ParseNodeType.EXPR_FUNC_INVOKE:
    case ParseNodeType.EXPR_UNI:
    case ParseNodeType.VAL_CONSTANT_BOOL:
    case ParseNodeType.VAL_CONSTANT_CHAR:
    case ParseNodeType.VAL_CONSTANT_FLOAT:
    case ParseNodeType.VAL_IDENTIFIER:
    default:  
  }
  return new GeneratorAttributeExpression(new QuadrupleArgumentValue(PrimitiveType.INT, 1));
}

const generateDeclarationPrimitive: generateRule<IGeneratorAttribute> = (ctx, node) => {
  const type: PrimitiveType = node.children[0].value as PrimitiveType;
  const declItems = node.children[1].children.map(i => {
    const name = i.children[0].value;
    if (i.children[1].type === ParseNodeType.VAL_UNINITIALIZED) {
      // const defaultValue = getDefaultValue(type);
      ctx.addEntry(name);
      ctx.addQuadruple(QuadrupleOperator.A_ASS,
        new QuadrupleArgumentValue(PrimitiveType.INT, 0),
        new QuadrupleArgumentNull(),
        new QuadrupleArgumentTableRef(name, 0),
        'default initialization'
      );
    } else {
      const value = generateExpression(ctx, i.children[1]);
    }
    return { name: i.children[0]};
  });
  return attr.valid();
}

const generateStatement: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  switch (node.type) {
    case ParseNodeType.STAT_DECLARATION_PRIM:
      generateDeclarationPrimitive(ctx, node);
      break;
  }
  return new GeneratorAttributeStatement(new QuadrupleArgumentQuadRef(0));
}

const generateSource: generateRule<IGeneratorAttribute> = (ctx, node) => {
  const rootContext = ctx.pushContext();
  const result = node.children.map(s => generateStatement(ctx, s));
  // chain result up (by reduce)
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
