import { ParseNode, ParseNodeType, ParseOperatorType } from './parser-node';
import {
  Quadruple, QuadrupleArg, QuadrupleArgArrayAddr, QuadrupleArgNull, QuadrupleArgQuadRef,
  QuadrupleArgTableRef, QuadrupleArgType, QuadrupleArgValue, QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
import { PrimitiveType } from './token';

const ARRAY_ADDR_OFFSET = 0;
const ARRAY_DIM_DEF_OFFSET = 1;

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
  private breakChain: number[] = [];
  private continueChain: number[] = [];

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

  public pushBreakChain(head: number = 0) {
    this.breakChain.push(head);
  }

  public popBreakChain(): number {
    const chain = this.breakChain.pop();
    if (chain === undefined) {
      throw new GeneratorError('pop empty break chain context');
    }
    return chain;
  }

  public mergeIntoBreakChain(chain: number) {
    const len = this.breakChain.length;
    if (len === 0) {
      throw new GeneratorError('no break chain, break statement outside of breakable block');
    }
    this.breakChain[len - 1] = this.mergeChain(this.breakChain[len - 1], chain);
  }

  public pushContinueChain(head: number = 0) {
    this.continueChain.push(head);
  }

  public popContinueChain(): number {
    const chain = this.continueChain.pop();
    if (chain === undefined) {
      throw new GeneratorError('pop empty break chain context');
    }
    return chain;
  }
  public mergeIntoContinueChain(chain: number) {
    const len = this.continueChain.length;
    if (len === 0) {
      throw new GeneratorError('no continue chain, continue statement outside of loop block');
    }
    this.continueChain[len - 1] = this.mergeChain(this.continueChain[len - 1], chain);
  }
}

interface IAttr {
  isValid: boolean;
}

class AttrStat implements IAttr {
  public isValid = true;
  public chain: number;
  constructor(chain: number) {
    this.chain = chain;
  }
}

class AttrExpr implements IAttr {
  public static newBoolExpr(trueChain: number, falseChain: number): AttrExpr {
    const expr = new AttrExpr();
    expr.trueChain = trueChain;
    expr.falseChain = falseChain;
    expr.isBoolean = true;
    return expr;
  }

  public static newPrimValue(type: PrimitiveType, value: any): AttrExpr {
    const quadValue = new QuadrupleArgValue(type, value);
    return new AttrExpr(quadValue);
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
      if (this.value.type === QuadrupleArgType.ARRAY_ADDR) {
        const temp = ctx.getTempVar();
        ctx.addQuadruple(QuadrupleOperator.A_RET, this.value, Q_NULL, temp, 'retrieve value of array reference');
        return temp;
      }
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

  public toRef(ctx: GeneratorContext): QuadrupleArg {
    if (this.isBoolean) {
      throw new GeneratorError('boolean cannot be used as reference value');
    }
    switch (this.value.type) {
      case QuadrupleArgType.TABLE_REF: // direct table reference
      case QuadrupleArgType.ARRAY_ADDR:  // indirect array reference
        return this.value;
      case QuadrupleArgType.VAR_TEMP: // temporary variable cannot be used as reference for assignment
      case QuadrupleArgType.NULL: // null value cannot be written
      case QuadrupleArgType.VALUE_INST: // instance value cannot be written
      default:
        throw new GeneratorError('value cannot be used as reference');
    }
  }
}

const attr = {
  valid: (): IAttr => ({ isValid: true }),
};

type generateRule<T extends IAttr> = (ctx: GeneratorContext, node: ParseNode) => T;

const generateExpressionUnary: generateRule<AttrExpr> = (ctx, node) => {
  // boolean operand
  const operand = generateExpression(ctx, node.children[0]);
  if (node.value === ParseOperatorType.UNI_NOT) {
    operand.toBoolean(ctx);
    return AttrExpr.newBoolExpr(operand.falseChain, operand.trueChain);
  }

  // value operand
  const opVal = operand.toValue(ctx);

  if (node.value === ParseOperatorType.UNI_POSIT) {
    return new AttrExpr(opVal);
  }
  if (node.value === ParseOperatorType.UNI_NEGATE) {
    const temp = ctx.getTempVar();
    ctx.addQuadruple(QuadrupleOperator.I_SUB, new QuadrupleArgValue(PrimitiveType.INT, 0), opVal, temp);
    return new AttrExpr(temp);
  }

  // Self-increment / decrement
  const temp = ctx.getTempVar();
  let temp2: QuadrupleArg | undefined;
  const Q_ZERO = new QuadrupleArgValue(PrimitiveType.INT, 0);
  const Q_ONE = new QuadrupleArgValue(PrimitiveType.INT, 1);
  switch (node.value) {
    case ParseOperatorType.UNI_INC_PRE:
      ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, Q_ONE, temp);
      ctx.addQuadruple(QuadrupleOperator.A_ASS, temp, Q_NULL, operand.toRef(ctx));
      break;
    case ParseOperatorType.UNI_INC_POS:
      ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, Q_ZERO, temp);
      temp2 = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_ADD, temp, Q_ONE, temp2);
      ctx.addQuadruple(QuadrupleOperator.A_ASS, temp2, Q_NULL, operand.toRef(ctx));
      break;
    case ParseOperatorType.UNI_DEC_PRE:
      ctx.addQuadruple(QuadrupleOperator.I_SUB, opVal, Q_ONE, temp);
      ctx.addQuadruple(QuadrupleOperator.A_ASS, temp, Q_NULL, operand.toRef(ctx));
      break;
    case ParseOperatorType.UNI_DEC_POS:
      ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, Q_ZERO, temp);
      temp2 = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_SUB, temp, Q_ONE, temp2);
      ctx.addQuadruple(QuadrupleOperator.A_ASS, temp2, Q_NULL, operand.toRef(ctx));
      break;
    default:
      throw new GeneratorError('unknown unary operator');
  }
  return new AttrExpr(temp);
};

const generateExpressionBinary: generateRule<AttrExpr> = (ctx, node) => {
  const op: ParseOperatorType = node.value;

  if (op === ParseOperatorType.BIN_LOG_AND || op === ParseOperatorType.BIN_LOG_OR) {
    const isAnd = op === ParseOperatorType.BIN_LOG_AND;

    const lOp = generateExpression(ctx, node.children[0]);
    lOp.toBoolean(ctx);
    ctx.backPatchChain(isAnd ? lOp.trueChain : lOp.falseChain, ctx.nextQuadrupleIndex);

    const rOp = generateExpression(ctx, node.children[1]);
    rOp.toBoolean(ctx);
    if (isAnd) {
      // AND operator
      return AttrExpr.newBoolExpr(rOp.trueChain,
        ctx.mergeChain(lOp.falseChain, rOp.falseChain));
    } else {
      // OR operator
      return AttrExpr.newBoolExpr(ctx.mergeChain(lOp.trueChain, rOp.trueChain),
        rOp.falseChain);
    }
  }
  const lOp = generateExpression(ctx, node.children[0]);
  const rOp = generateExpression(ctx, node.children[1]);

  const genRelOperator = (qop: QuadrupleOperator): AttrExpr => {
    const boolExpr = AttrExpr.newBoolExpr(ctx.nextQuadrupleIndex,
      ctx.nextQuadrupleIndex + 1);
    ctx.addQuadruple(qop, lOp.toValue(ctx), rOp.toValue(ctx), new QuadrupleArgQuadRef(0));
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0));
    return boolExpr;
  };

  const genAssOperator = (assOp: QuadrupleOperator): AttrExpr => {
    const temp = ctx.getTempVar();
    ctx.addQuadruple(assOp, lOp.toRef(ctx), rOp.toValue(ctx), temp);
    ctx.addQuadruple(QuadrupleOperator.A_ASS, temp, Q_NULL, lOp.toRef(ctx));
    return new AttrExpr(temp);
  };

  const genIntOperator = (intOp: QuadrupleOperator): AttrExpr => {
    const temp = ctx.getTempVar();
    ctx.addQuadruple(intOp, lOp.toValue(ctx), rOp.toValue(ctx), temp);
    return new AttrExpr(temp);
  };

  switch (op) {
    case ParseOperatorType.BIN_ADD: return genIntOperator(QuadrupleOperator.I_ADD);
    case ParseOperatorType.BIN_SUB: return genIntOperator(QuadrupleOperator.I_SUB);
    case ParseOperatorType.BIN_MULTI: return genIntOperator(QuadrupleOperator.I_MUL);
    case ParseOperatorType.BIN_DIVIDE: return genIntOperator(QuadrupleOperator.I_DIV);
    case ParseOperatorType.BIN_ASS_ADD: return genAssOperator(QuadrupleOperator.I_ADD);
    case ParseOperatorType.BIN_ASS_SUB: return genAssOperator(QuadrupleOperator.I_SUB);
    case ParseOperatorType.BIN_ASS_MUL: return genAssOperator(QuadrupleOperator.I_MUL);
    case ParseOperatorType.BIN_ASS_DIV: return genAssOperator(QuadrupleOperator.I_DIV);
    case ParseOperatorType.BIN_ASS_VAL:
      ctx.addQuadruple(QuadrupleOperator.A_ASS, rOp.toValue(ctx), Q_NULL, lOp.toRef(ctx));
      return new AttrExpr(lOp.toRef(ctx));
    case ParseOperatorType.BIN_REL_EQ: return genRelOperator(QuadrupleOperator.J_EQ);
    case ParseOperatorType.BIN_REL_GT: return genRelOperator(QuadrupleOperator.J_GT);
    case ParseOperatorType.BIN_REL_GTE: return genRelOperator(QuadrupleOperator.J_GTE);
    case ParseOperatorType.BIN_REL_LT: return genRelOperator(QuadrupleOperator.J_LT);
    case ParseOperatorType.BIN_REL_LTE: return genRelOperator(QuadrupleOperator.J_LTE);
    case ParseOperatorType.BIN_REL_NE: return genRelOperator(QuadrupleOperator.J_NE);
    default:
      return new AttrExpr();
  }
};

const generateExpressionFuncInvoke: generateRule<AttrExpr> = (ctx, node) => {
  const func = generateExpression(ctx, node.children[0]).toValue(ctx);
  const argList = node.children[1].children;
  argList.forEach((arg) => {
    const val = generateExpression(ctx, arg).toValue(ctx);
    ctx.addQuadruple(QuadrupleOperator.F_PARA, Q_NULL, Q_NULL, val);
  });
  ctx.addQuadruple(QuadrupleOperator.F_FUNC, Q_NULL, Q_NULL, func);

  const temp = ctx.getTempVar();
  ctx.addQuadruple(QuadrupleOperator.F_VAL, Q_NULL, Q_NULL, temp);
  return new AttrExpr(temp);
};

const generateExpressionArrAccess: generateRule<AttrExpr> = (ctx, node) => {
  const id = node.children[0].value;

  // assert the compatibility of size

  let addrOffset: QuadrupleArg | undefined;
  node.children[1].children.map((dimNode, index) => {
    const dimAttr = generateExpression(ctx, dimNode).toValue(ctx);
    const arrLenRef = new QuadrupleArgArrayAddr(ctx.getEntry(id),
      new QuadrupleArgValue(PrimitiveType.INT, ARRAY_DIM_DEF_OFFSET + index));
    if (addrOffset) {
      const arrLen = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.A_RET, arrLenRef, Q_NULL, arrLen,
        'retrieve array size of ' + index + ' dimension');
      const multiOffset = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_MUL, addrOffset, arrLen, multiOffset, 'multiply dim size');
      const addOffset = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_ADD, multiOffset, dimAttr, addOffset, 'add dim offset');
      addrOffset = addOffset;
    } else {
      // first dimension
      addrOffset = dimAttr;
    }
  });
  if (!addrOffset) {
    throw new GeneratorError('empty array index list');
  }

  const totalOffset = ctx.getTempVar();
  const elementSize = 1; // TODO: get size by element type
  ctx.addQuadruple(QuadrupleOperator.I_MUL, addrOffset, new QuadrupleArgValue(PrimitiveType.INT, elementSize),
    totalOffset, 'calc total size');

  const addrRef = new QuadrupleArgArrayAddr(ctx.getEntry(id),
    new QuadrupleArgValue(PrimitiveType.INT, ARRAY_ADDR_OFFSET));
  const addrTemp = ctx.getTempVar();
  ctx.addQuadruple(QuadrupleOperator.A_RET, addrRef, Q_NULL, addrTemp, 'retrieve array base address at heap');
  return new AttrExpr(new QuadrupleArgArrayAddr(addrTemp, totalOffset));
};

const generateExpression: generateRule<AttrExpr> = (ctx, node) => {
  switch (node.type) {
    case ParseNodeType.VAL_CONSTANT_INT:
      return AttrExpr.newPrimValue(PrimitiveType.INT, node.value);
    case ParseNodeType.VAL_CONSTANT_BOOL:
      return AttrExpr.newPrimValue(PrimitiveType.BOOL, node.value);
    case ParseNodeType.VAL_CONSTANT_CHAR:
      return AttrExpr.newPrimValue(PrimitiveType.CHAR, node.value);
    case ParseNodeType.VAL_CONSTANT_FLOAT:
      return AttrExpr.newPrimValue(PrimitiveType.FLOAT, node.value);
    case ParseNodeType.EXPR_UNI:
      return generateExpressionUnary(ctx, node);
    case ParseNodeType.EXPR_BIN:
      return generateExpressionBinary(ctx, node);
    case ParseNodeType.EXPR_ARR_ACCESS:
      return generateExpressionArrAccess(ctx, node);
    case ParseNodeType.EXPR_FUNC_INVOKE:
      return generateExpressionFuncInvoke(ctx, node);
    case ParseNodeType.VAL_IDENTIFIER:
      return new AttrExpr(ctx.getEntry(node.value));
    case ParseNodeType.VAL_UNINITIALIZED:
    default:
      return AttrExpr.newPrimValue(PrimitiveType.VOID, null);
  }
};

const generateDeclarationPrimitive: generateRule<IAttr> = (ctx, node) => {
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

const generateDeclarationArray: generateRule<IAttr> = (ctx, node) => {

  const arrType = node.children[0];
  const primitiveType = arrType.children[0];
  const arrDimensionDef = arrType.children[1];
  const arrayName = node.children[1].value;
  ctx.addEntry(arrayName); // dimension, type, name

  let size: QuadrupleArg | undefined;
  arrDimensionDef.children.map((dim, index) => {
    const dimExpr = generateExpression(ctx, dim);
    const dimRef = new QuadrupleArgArrayAddr(ctx.getEntry(arrayName),
      new QuadrupleArgValue(PrimitiveType.INT, index + ARRAY_DIM_DEF_OFFSET));
    ctx.addQuadruple(QuadrupleOperator.A_ASS, dimExpr.toValue(ctx),
      Q_NULL, dimRef, 'Set array size of ' + index + ' dimension');
    if (size) {
      const temp = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_MUL, size, dimExpr.toValue(ctx), temp, 'calc array size');
    } else {
      size = dimExpr.toValue(ctx);
    }
  });
  if (!size) {
    throw new GeneratorError('empty array dimension');
  }
  const totalSize = ctx.getTempVar();
  const elementSize = 1; // TODO: get size by element type
  ctx.addQuadruple(QuadrupleOperator.I_MUL, size, new QuadrupleArgValue(PrimitiveType.INT, elementSize),
    totalSize, 'calc total size');

  const addrRef = new QuadrupleArgArrayAddr(ctx.getEntry(arrayName),
    new QuadrupleArgValue(PrimitiveType.INT, ARRAY_ADDR_OFFSET));
  const heapAddr = ctx.getTempVar();
  ctx.addQuadruple(QuadrupleOperator.M_REQ, totalSize, Q_NULL, heapAddr, 'request memory allocation');
  ctx.addQuadruple(QuadrupleOperator.A_ASS, heapAddr, Q_NULL, addrRef, 'save dynamic array address');
  return attr.valid();
};

const generateFunction: generateRule<IAttr> = (ctx, node) => {
  return attr.valid();
};

const generateStatementIf: generateRule<AttrStat> = (ctx, node) => {
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);
  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied
  const body = generateStatement(ctx, node.children[1]);
  const chain = ctx.mergeChain(condition.falseChain, body.chain);
  return new AttrStat(chain);
};

const generateStatementIfElse: generateRule<AttrStat> = (ctx, node) => {
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
  return new AttrStat(chain);
};

const generateStatementSequence: generateRule<AttrStat> = (ctx, node) => {
  // TODO: new execution context
  const chain = node.children.reduce((lastChain, stat) => {
    ctx.backPatchChain(lastChain, ctx.nextQuadrupleIndex);
    return generateStatement(ctx, stat).chain;
  }, 0);
  return new AttrStat(chain);
};

const generateStatementWhile: generateRule<AttrStat> = (ctx, node) => {
  // while statement can embrace break and continue
  ctx.pushBreakChain(0);
  ctx.pushContinueChain(0);

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

  const breakChain = ctx.popBreakChain();
  const continueChain = ctx.popContinueChain();

  ctx.backPatchChain(continueChain, beginNxq);
  const exitChain = ctx.mergeChain(condition.falseChain, breakChain);

  return new AttrStat(exitChain);
};

const generateStatementDo: generateRule<AttrStat> = (ctx, node) => {
  // do statement can embrace break and continue
  ctx.pushBreakChain(0);
  ctx.pushContinueChain(0);
  const beginNxq = ctx.nextQuadrupleIndex;
  const body = generateStatement(ctx, node.children[0]);
  ctx.backPatchChain(body.chain, ctx.nextQuadrupleIndex);

  const conditionQuad = ctx.nextQuadrupleIndex;
  const condition = generateExpression(ctx, node.children[1]);
  condition.toBoolean(ctx);
  ctx.backPatchChain(condition.trueChain, beginNxq); // condition satisfied

  const breakChain = ctx.popBreakChain();
  const continueChain = ctx.popContinueChain();

  ctx.backPatchChain(continueChain, conditionQuad);
  const exitChain = ctx.mergeChain(breakChain, condition.falseChain);

  return new AttrStat(exitChain);
};

const generateStatementSwitch: generateRule<AttrStat> = (ctx, node) => {
  ctx.pushBreakChain(0);

  const exprAttr = generateExpression(ctx, node.children[0]).toValue(ctx);
  const gotoTest = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
    'Switch: jump to table');
  const jumpTable: Array<[ParseNode, number]> = [];
  let defaultQuad = -1;

  // this chain is the last statement of switch body
  const lastStatChain = node.children[1].children.reduce((lastChain, stat) => {
    const nxq = ctx.nextQuadrupleIndex;
    ctx.backPatchChain(lastChain, nxq);
    if (stat.type === ParseNodeType.SEG_CASE_LABEL) {
      jumpTable.push([stat.children[0], nxq]);
      return 0;
    }
    if (stat.type === ParseNodeType.SEG_DEFAULT_LABEL) {
      defaultQuad = nxq;
      return 0;
    }
    return generateStatement(ctx, stat).chain;
  }, 0);
  ctx.backPatchChain(lastStatChain, ctx.nextQuadrupleIndex);

  const blockChain = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
    'Switch: end of switch body');

  // generate test table
  ctx.backPatchChain(gotoTest, ctx.nextQuadrupleIndex);
  jumpTable.map((item) => {
    const itemAttr = generateExpression(ctx, item[0]).toValue(ctx);
    ctx.addQuadruple(QuadrupleOperator.J_EQ, exprAttr, itemAttr, new QuadrupleArgQuadRef(item[1]),
      'switch: case ' + itemAttr.toString());
  });
  if (defaultQuad >= 0) {
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(defaultQuad),
      'switch: default case');
  }

  return new AttrStat(ctx.mergeChain(blockChain, ctx.popBreakChain()));
};

const generateStatementReturn: generateRule<IAttr> = (ctx, node) => {
  const exprAttr = generateExpression(ctx, node.children[0]).toValue(ctx);
  ctx.addQuadruple(QuadrupleOperator.F_REV, Q_NULL, Q_NULL, exprAttr);
  ctx.addQuadruple(QuadrupleOperator.F_RET, Q_NULL, Q_NULL, Q_NULL);
  return attr.valid();
};

const generateStatementReturnVoid: generateRule<IAttr> = (ctx, node) => {
  ctx.addQuadruple(QuadrupleOperator.F_RET, Q_NULL, Q_NULL, Q_NULL);
  return attr.valid();
};

const generateStatementBreak: generateRule<IAttr> = (ctx, node) => {
  const nxq = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0), 'break');
  ctx.mergeIntoBreakChain(nxq);
  return attr.valid();
};

const generateStatementContinue: generateRule<IAttr> = (ctx, node) => {
  const nxq = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL,  new QuadrupleArgQuadRef(0), 'continue');
  ctx.mergeIntoContinueChain(nxq);
  return attr.valid();
};

const generateStatement: generateRule<AttrStat> = (ctx, node) => {
  switch (node.type) {
    case ParseNodeType.STAT_IF:
      return generateStatementIf(ctx, node);
    case ParseNodeType.STAT_IF_ELSE:
      return generateStatementIfElse(ctx, node);
    case ParseNodeType.STAT_SEQUENCE:
      return generateStatementSequence(ctx, node);
    case ParseNodeType.STAT_WHILE:
      return generateStatementWhile(ctx, node);
    case ParseNodeType.STAT_DO:
      return generateStatementDo(ctx, node);
    case ParseNodeType.STAT_SWITCH:
      return generateStatementSwitch(ctx, node);

    case ParseNodeType.STAT_RETURN:
      generateStatementReturn(ctx, node);
      break;
    case ParseNodeType.STAT_RETURN_VOID:
      generateStatementReturnVoid(ctx, node);
      break;
    case ParseNodeType.STAT_BREAK:
      generateStatementBreak(ctx, node);
      break;
    case ParseNodeType.STAT_CONTINUE:
      generateStatementContinue(ctx, node);
      break;

    case ParseNodeType.STAT_FUNCTION:
      generateFunction(ctx, node);
      break;
    case ParseNodeType.STAT_DECLARATION_ARR:
      generateDeclarationArray(ctx, node);
      break;
    case ParseNodeType.STAT_DECLARATION_PRIM:
      generateDeclarationPrimitive(ctx, node);
      break;
    case ParseNodeType.STAT_EXPR:
      generateExpression(ctx, node.children[0]);
      // discard the result of single expression as a statement
      break;
  }
  return new AttrStat(0);
};

const generateSource: generateRule<IAttr> = (ctx, node) => {
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
