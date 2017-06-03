import { ParseNode, ParseNodeType, ParseOperatorType } from './parser-node';
import {
  Quadruple, QuadrupleArg, QuadrupleArgNull, QuadrupleArgQuadRef, QuadrupleArgTableRef,
  QuadrupleArgValue, QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
import { PrimitiveType } from './token';

const Q_NULL = QuadrupleArgNull.Q_NULL;

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

  public backPatchChain(head: number, target: number) {
    let q = head;
    while (q !== 0) {
      const quadRef = this.quadrupleList[q].result as QuadrupleArgQuadRef;
      q = quadRef.quadIndex;
      quadRef.quadIndex = target;
    }
  }

  public mergeChain(oHead: number, nHead: number): number {
    if (nHead === 0) {
      return oHead;
    }
    let q = nHead;
    while (true) {
      const quadRef = this.quadrupleList[q].result as QuadrupleArgQuadRef;
      q = quadRef.quadIndex;
      if (q === 0) {
        quadRef.quadIndex = oHead;
        break;
      }
    }
    return nHead;
  }
}

interface IGeneratorAttribute {
  isValid: boolean;
}

class GeneratorAttributeStatement implements IGeneratorAttribute {
  public isValid = true;
  public chain: number;
  constructor(chain: number) {
    this.chain = chain;
  }
}

class GeneratorAttributeExpression implements IGeneratorAttribute {
  public static newBoolExpr(trueChain: number, falseChain: number) {
    const expr = new GeneratorAttributeExpression();
    expr.trueChain = trueChain;
    expr.falseChain = falseChain;
    expr.isBoolean = true;
    return expr;
  }
  public isValid = true;
  public isBoolean = false;
  public generatedValue: QuadrupleArg | undefined;
  public trueChain = 0;
  public falseChain = 0;

  constructor(value?: QuadrupleArg) {
    this.generatedValue = value;
  }

  private get value(): QuadrupleArg {
    if (this.generatedValue) { return this.generatedValue; }
    return Q_NULL;
  }

  // convert value to boolean chain (binary jump)
  public toBoolean(ctx: GeneratorContext) {
    if (this.isBoolean) {
      return;
    }
    const nxq = ctx.nextQuadrupleIndex;
    this.isBoolean = true;
    this.trueChain = nxq;
    this.falseChain = nxq + 1;
    ctx.addQuadruple(QuadrupleOperator.J_NEZ, this.value, Q_NULL, new QuadrupleArgQuadRef(0),
      'convert value to boolean: value is not zero (truly)');
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
      'convert value to boolean: value is zero (falsy)');
  }

  // convert boolean chain to value
  public toValue(ctx: GeneratorContext): QuadrupleArg {
    if (!this.isBoolean) {
      return this.value;
    }
    const temp = ctx.getTempVar();
    const nxq = ctx.nextQuadrupleIndex;

    // nxq
    ctx.addQuadruple(QuadrupleOperator.A_ASS, new QuadrupleArgValue(PrimitiveType.BOOL, true),
      Q_NULL, temp, 'convert boolean to value: true');
    // nxq + 1
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL,
      new QuadrupleArgQuadRef(nxq + 3), 'convert boolean to value: jump');
    // nxq + 2
    ctx.addQuadruple(QuadrupleOperator.A_ASS, new QuadrupleArgValue(PrimitiveType.BOOL, false),
      Q_NULL, temp, 'convert boolean to value: false');
    // nxq + 3

    ctx.backPatchChain(this.trueChain, nxq);
    ctx.backPatchChain(this.falseChain, nxq + 2);
    this.trueChain = this.falseChain = 0;
    this.isBoolean = false;
    this.generatedValue = temp;
    return this.value;
  }
}

const attr = {
  valid: (): IGeneratorAttribute => ({ isValid: true }),
};

type generateRule<T extends IGeneratorAttribute> = (ctx: GeneratorContext, node: ParseNode) => T;

const generateExpression: generateRule<GeneratorAttributeExpression> = (ctx, node) => {
  let returnVal: QuadrupleArg = Q_NULL;
  let t: QuadrupleArg | null = null;
  let boolExpr = false, trueChain = 0, falseChain = 0;
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
    case ParseNodeType.EXPR_BIN:
      {
        const op: ParseOperatorType = node.value;

        if (op === ParseOperatorType.BIN_LOG_AND || op === ParseOperatorType.BIN_LOG_OR) {
          const isAnd = op === ParseOperatorType.BIN_LOG_AND;
          boolExpr = true;

          const lOp = generateExpression(ctx, node.children[0]);
          lOp.toBoolean(ctx);
          ctx.backPatchChain(isAnd ? lOp.trueChain : lOp.falseChain, ctx.nextQuadrupleIndex);

          const rOp = generateExpression(ctx, node.children[1]);
          rOp.toBoolean(ctx);
          if (isAnd) {
            trueChain = rOp.trueChain;
            falseChain = ctx.mergeChain(lOp.falseChain, rOp.falseChain);
          } else {
            trueChain = ctx.mergeChain(lOp.trueChain, rOp.trueChain);
            falseChain = rOp.falseChain;
          }

          break;
        }
        const lOp = generateExpression(ctx, node.children[0]);
        const rOp = generateExpression(ctx, node.children[1]);

        const lOperand: QuadrupleArg = lOp.toValue(ctx);
        const rOperand: QuadrupleArg = rOp.toValue(ctx);

        const genRelOperator = (qop: QuadrupleOperator): void => {
          boolExpr = true;
          trueChain = ctx.nextQuadrupleIndex;
          falseChain = ctx.nextQuadrupleIndex + 1;
          ctx.addQuadruple(qop, lOperand, rOperand, new QuadrupleArgQuadRef(0));
          ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0));
        };

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
            ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), Q_NULL, lOperand);
            break;
          case ParseOperatorType.BIN_ASS_SUB:
            ctx.addQuadruple(QuadrupleOperator.I_SUB, lOperand, rOperand, tempVar());
            ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), Q_NULL, lOperand);
            break;
          case ParseOperatorType.BIN_ASS_MUL:
            ctx.addQuadruple(QuadrupleOperator.I_MUL, lOperand, rOperand, tempVar());
            ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), Q_NULL, lOperand);
            break;
          case ParseOperatorType.BIN_ASS_DIV:
            ctx.addQuadruple(QuadrupleOperator.I_DIV, lOperand, rOperand, tempVar());
            ctx.addQuadruple(QuadrupleOperator.A_ASS, tempVar(), Q_NULL, lOperand);
            break;
          case ParseOperatorType.BIN_ASS_VAL:
            ctx.addQuadruple(QuadrupleOperator.A_ASS, rOperand, Q_NULL, lOperand);
            break;
          case ParseOperatorType.BIN_REL_EQ: genRelOperator(QuadrupleOperator.J_EQ); break;
          case ParseOperatorType.BIN_REL_GT: genRelOperator(QuadrupleOperator.J_GT); break;
          case ParseOperatorType.BIN_REL_GTE: genRelOperator(QuadrupleOperator.J_GTE); break;
          case ParseOperatorType.BIN_REL_LT: genRelOperator(QuadrupleOperator.J_LT); break;
          case ParseOperatorType.BIN_REL_LTE: genRelOperator(QuadrupleOperator.J_LTE); break;
          case ParseOperatorType.BIN_REL_NE: genRelOperator(QuadrupleOperator.J_NE); break;
        }
        returnVal = t || lOperand;
      }
      break;
    case ParseNodeType.EXPR_ARR_ACCESS:
    case ParseNodeType.EXPR_FUNC_INVOKE:
      {
        const func = generateExpression(ctx, node.children[0]).toValue(ctx);
        const argList = node.children[1].children;
        argList.forEach((arg) => {
          const val = generateExpression(ctx, arg).toValue(ctx);
          ctx.addQuadruple(QuadrupleOperator.F_PARA, Q_NULL, Q_NULL, val);
        });
        ctx.addQuadruple(QuadrupleOperator.F_FUNC, Q_NULL, Q_NULL, func);
        ctx.addQuadruple(QuadrupleOperator.F_VAL, Q_NULL, Q_NULL, tempVar());
        returnVal = tempVar();
      }
      break;
    case ParseNodeType.EXPR_UNI:
      {
        const operand = generateExpression(ctx, node.children[0]);
        if (node.value === ParseOperatorType.UNI_NOT) {
          operand.toBoolean(ctx);
          boolExpr = true;
          trueChain = operand.falseChain;
          falseChain = operand.trueChain;
          break;
        }
        const opVal = operand.toValue(ctx);
        switch (node.value) {
          case ParseOperatorType.UNI_POSIT:
            break;
          case ParseOperatorType.UNI_NEGATE:
            ctx.addQuadruple(QuadrupleOperator.I_SUB, new QuadrupleArgValue(PrimitiveType.INT, 0), opVal, tempVar());
            break;
          case ParseOperatorType.UNI_INC_PRE:
            ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, new QuadrupleArgValue(PrimitiveType.INT, 1), opVal);
            ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
            break;
          case ParseOperatorType.UNI_INC_POS:
            ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
            ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, new QuadrupleArgValue(PrimitiveType.INT, 1), opVal);
            break;
          case ParseOperatorType.UNI_DEC_PRE:
            ctx.addQuadruple(QuadrupleOperator.I_SUB, opVal, new QuadrupleArgValue(PrimitiveType.INT, 1), opVal);
            ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
            break;
          case ParseOperatorType.UNI_DEC_POS:
            ctx.addQuadruple(QuadrupleOperator.I_SUB, opVal, new QuadrupleArgValue(PrimitiveType.INT, 0), tempVar());
            ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, new QuadrupleArgValue(PrimitiveType.INT, 1), opVal);
            break;
        }
        returnVal = t || opVal;
      }
      break;
    case ParseNodeType.VAL_UNINITIALIZED:
    default:
      returnVal = new QuadrupleArgValue(PrimitiveType.INT, 1);
  }
  if (boolExpr) {
    return GeneratorAttributeExpression.newBoolExpr(trueChain, falseChain);
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
        Q_NULL,
        ref,
        'default initialization',
      );
    } else {
      const value = generateExpression(ctx, i.children[1]);
      ctx.addQuadruple(QuadrupleOperator.A_ASS, value.toValue(ctx), Q_NULL, ref);
    }
    return { name: i.children[0]};
  });
  return attr.valid();
};

const generateStatementIf: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);
  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied
  const body = generateStatement(ctx, node.children[1]);
  const chain = ctx.mergeChain(condition.falseChain, body.chain);
  return new GeneratorAttributeStatement(chain);
};

const generateStatementIfElse: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);

  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied
  const bodyThen = generateStatement(ctx, node.children[1]);

  const jumpChain = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
    'end of if-then block');
  bodyThen.chain = ctx.mergeChain(bodyThen.chain, jumpChain);

  ctx.backPatchChain(condition.falseChain, ctx.nextQuadrupleIndex); // condition satisfied
  const bodyElse = generateStatement(ctx, node.children[2]);

  const chain = ctx.mergeChain(bodyThen.chain, bodyElse.chain);
  return new GeneratorAttributeStatement(chain);
};

const generateStatementSequence: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  // TODO: new execution context
  const chain = node.children.reduce((lastChain, stat) => {
    ctx.backPatchChain(lastChain, ctx.nextQuadrupleIndex);
    return generateStatement(ctx, stat).chain;
  }, 0);
  return new GeneratorAttributeStatement(chain);
};

const generateStatementWhile: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  const beginNxq = ctx.nextQuadrupleIndex;
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);
  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied
  const body = generateStatement(ctx, node.children[1]);

  const jumpChain = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
    'end of while loop');
  body.chain = ctx.mergeChain(body.chain, jumpChain);

  ctx.backPatchChain(body.chain, beginNxq);

  return new GeneratorAttributeStatement(condition.falseChain);
};

const generateStatement: generateRule<GeneratorAttributeStatement> = (ctx, node) => {
  switch (node.type) {
    case ParseNodeType.STAT_IF:
      return generateStatementIf(ctx, node);
    case ParseNodeType.STAT_IF_ELSE:
      return generateStatementIfElse(ctx, node);
    case ParseNodeType.STAT_SEQUENCE:
      return generateStatementSequence(ctx, node);
    case ParseNodeType.STAT_WHILE:
      return generateStatementWhile(ctx, node);
    case ParseNodeType.STAT_DECLARATION_PRIM:
      generateDeclarationPrimitive(ctx, node);
      break;
    case ParseNodeType.STAT_EXPR:
      generateExpression(ctx, node.children[0]);
      // discard the result of single expression as a statement
      break;
  }
  return new GeneratorAttributeStatement(0);
};

const generateSource: generateRule<IGeneratorAttribute> = (ctx, node) => {
  const rootContext = ctx.pushContext();
  const result = node.children.reduce((lastChain, s) => {
    ctx.backPatchChain(lastChain, ctx.nextQuadrupleIndex);
    return generateStatement(ctx, s).chain;
  }, 0);
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
