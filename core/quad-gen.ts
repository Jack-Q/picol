import { ParseNode, ParseNodeType, ParseOperatorType } from './parser-node';
import {
  Quadruple, QuadrupleArg, QuadrupleArgNull, QuadrupleArgQuadRef, QuadrupleArgTableRef,
  QuadrupleArgValue, QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
import { PrimitiveType } from './token';

class GeneratorError extends Error {

  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

class ExecutionContext {
  public parent: ExecutionContext;
  private nameTable: { [name: string]: { name: string } } = {};
  public get isRoot(): boolean {
    return this.parent === undefined;
  }

  constructor(parent: ExecutionContext) {
    this.parent = parent;
  }

  public addEntry(name: string) {
    this.nameTable[name] = { name };
  }

  public getEntry(name: string, recursive: boolean = true): string {
    if (this.nameTable[name]) {
      return this.nameTable[name].name;
    }
    return this.isRoot ? '' : this.parent.getEntry(name);
  }
}

export class GeneratorContext {
  // the context contains all kinds of
  private tempIndex = 0;
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

  public addEntry(name: string): QuadrupleArgTableRef {
    this.currentContext.addEntry(name);
    return new QuadrupleArgTableRef(name, 0);
  }

  public getEntry(name: string): QuadrupleArgTableRef {
    return new QuadrupleArgTableRef(this.currentContext.getEntry(name), 0);
  }

  public addQuadruple(op: QuadrupleOperator, arg1: QuadrupleArg, arg2: QuadrupleArg, result: QuadrupleArg,
                      comment: string = '') {
    const quadruple = new Quadruple();
    quadruple.operator = op;
    quadruple.argument1 = arg1;
    quadruple.argument2 = arg2;
    quadruple.result = result;
    quadruple.comment = comment;
    this.quadrupleList.push(quadruple);
  }

  public getTempVar() {
    return new QuadrupleArgVarTemp(this.tempIndex++);
  }
}

interface IGeneratorAttribute {
  isValid: boolean;
}

class GeneratorAttributeStatement implements IGeneratorAttribute {
  public isValid = true;
  public chain: QuadrupleArgQuadRef;
  constructor(chain: QuadrupleArgQuadRef) {
    this.chain = chain;
  }
}

class GeneratorAttributeExpression implements IGeneratorAttribute {
  public isValid = true;
  public value: QuadrupleArg;
  constructor(value: QuadrupleArg) {
    this.value = value;
  }
}

const attr = {
  valid: (): IGeneratorAttribute => ({ isValid: true }),
};

type generateRule<T extends IGeneratorAttribute> = (ctx: GeneratorContext, node: ParseNode) => T;

const generateExpression: generateRule<GeneratorAttributeExpression> = (ctx, node) => {
  let returnVal: QuadrupleArg;
  let t: QuadrupleArg | null = null;
  const tempVar = () => t = t || ctx.getTempVar();
  switch (node.type) {
    case ParseNodeType.VAL_CONSTANT_INT:
      returnVal = new QuadrupleArgValue(PrimitiveType.INT, node.value);
      break;
    case ParseNodeType.VAL_CONSTANT_BOOL:
      returnVal = new QuadrupleArgValue(PrimitiveType.BOOL, node.value);
      break;
    case ParseNodeType.VAL_CONSTANT_CHAR:
      returnVal = new QuadrupleArgValue(PrimitiveType.CHAR, node.value);
      break;
    case ParseNodeType.VAL_CONSTANT_FLOAT:
      returnVal = new QuadrupleArgValue(PrimitiveType.FLOAT, node.value);
      break;
    case ParseNodeType.VAL_IDENTIFIER:
      returnVal = ctx.getEntry(node.value);
      break;
    case ParseNodeType.EXPR_BIN: {

      const op: ParseOperatorType = node.value;
      const lOperand: QuadrupleArg = generateExpression(ctx, node.children[0]).value;
      const rOperand: QuadrupleArg = generateExpression(ctx, node.children[1]).value;
      switch (op) {
        case ParseOperatorType.BIN_ADD:
          ctx.addQuadruple(QuadrupleOperator.I_ADD, lOperand, rOperand, tempVar());
          break;
        case ParseOperatorType.BIN_SUB:
          ctx.addQuadruple(QuadrupleOperator.I_SUB, lOperand, rOperand, tempVar());
          break;
        case ParseOperatorType.BIN_MULTI:
          ctx.addQuadruple(QuadrupleOperator.I_MUL, lOperand, rOperand, tempVar());
          break;
        case ParseOperatorType.BIN_DIVIDE:
          ctx.addQuadruple(QuadrupleOperator.I_DIV, lOperand, rOperand, tempVar());
          break;
        case ParseOperatorType.BIN_ASS_ADD:
          ctx.addQuadruple(QuadrupleOperator.I_ADD, lOperand, rOperand, tempVar());
          ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), new QuadrupleArgNull(), lOperand);
          break;
        case ParseOperatorType.BIN_ASS_SUB:
          ctx.addQuadruple(QuadrupleOperator.I_SUB, lOperand, rOperand, tempVar());
          ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), new QuadrupleArgNull(), lOperand);
          break;
        case ParseOperatorType.BIN_ASS_MUL:
          ctx.addQuadruple(QuadrupleOperator.I_MUL, lOperand, rOperand, tempVar());
          ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), new QuadrupleArgNull(), lOperand);
          break;
        case ParseOperatorType.BIN_ASS_DIV:
          ctx.addQuadruple(QuadrupleOperator.I_DIV, lOperand, rOperand, tempVar());
          ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), new QuadrupleArgNull(), lOperand);
          break;
        case ParseOperatorType.BIN_ASS_VAL:
          ctx.addQuadruple(QuadrupleOperator.A_ASS, rOperand, new QuadrupleArgNull(), lOperand);
          break;
      }
      returnVal = t || lOperand;
    }
                                 break;
    case ParseNodeType.VAL_UNINITIALIZED:
    case ParseNodeType.EXPR_ARR_ACCESS:
    case ParseNodeType.EXPR_FUNC_INVOKE:
    case ParseNodeType.EXPR_UNI: {
      const operand = generateExpression(ctx, node.children[0]).value;
      switch (node.value) {
        case ParseOperatorType.UNI_POSIT:
          break;
        case ParseOperatorType.UNI_NEGATE:
          ctx.addQuadruple(QuadrupleOperator.I_SUB, new QuadrupleArgValue(PrimitiveType.INT, 0), operand, tempVar());
          break;
        case ParseOperatorType.UNI_NOT:
          // TODO
          break;
        case ParseOperatorType.UNI_INC_PRE:
          ctx.addQuadruple(QuadrupleOperator.I_ADD, operand, new QuadrupleArgValue(PrimitiveType.INT, 1), operand);
          ctx.addQuadruple(QuadrupleOperator.I_ADD, operand, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
          break;
        case ParseOperatorType.UNI_INC_POS:
          ctx.addQuadruple(QuadrupleOperator.I_ADD, operand, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
          ctx.addQuadruple(QuadrupleOperator.I_ADD, operand, new QuadrupleArgValue(PrimitiveType.INT, 1), operand);
          break;
        case ParseOperatorType.UNI_DEC_PRE:
          ctx.addQuadruple(QuadrupleOperator.I_SUB, operand, new QuadrupleArgValue(PrimitiveType.INT, 1), operand);
          ctx.addQuadruple(QuadrupleOperator.I_ADD, operand, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
          break;
        case ParseOperatorType.UNI_DEC_POS:
          ctx.addQuadruple(QuadrupleOperator.I_SUB, operand, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
          ctx.addQuadruple(QuadrupleOperator.I_ADD, operand, new QuadrupleArgValue(PrimitiveType.INT, 1), operand);
          break;

      }
      returnVal = t || operand;
    }
    default:
      returnVal = new QuadrupleArgValue(PrimitiveType.INT, 1);
  }
  return new GeneratorAttributeExpression(returnVal);
};

const generateDeclarationPrimitive: generateRule<IGeneratorAttribute> = (ctx, node) => {
  const type: PrimitiveType = node.children[0].value as PrimitiveType;
  const declItems = node.children[1].children.map((i) => {
    const name = i.children[0].value;
    const ref = ctx.addEntry(name);
    if (i.children[1].type === ParseNodeType.VAL_UNINITIALIZED) {
      // const defaultValue = getDefaultValue(type);
      ctx.addQuadruple(QuadrupleOperator.A_ASS,
        new QuadrupleArgValue(PrimitiveType.INT, 0),
        new QuadrupleArgNull(),
        ref,
        'default initialization',
      );
    } else {
      const value = generateExpression(ctx, i.children[1]);
      ctx.addQuadruple(QuadrupleOperator.A_ASS, value.value, new QuadrupleArgNull(), ref);
    }
    return { name: i.children[0]};
  });
  return attr.valid();
};

const generateStatement: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  switch (node.type) {
    case ParseNodeType.STAT_DECLARATION_PRIM:
      generateDeclarationPrimitive(ctx, node);
      break;
    case ParseNodeType.STAT_EXPR:
      generateExpression(ctx, node.children[0]);
      break;
  }
  return new GeneratorAttributeStatement(new QuadrupleArgQuadRef(0));
};

const generateSource: generateRule<IGeneratorAttribute> = (ctx, node) => {
  const rootContext = ctx.pushContext();
  const result = node.children.map((s) => generateStatement(ctx, s));
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
