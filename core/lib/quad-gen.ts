import { ExecutionContext, GeneratorContext } from './context';
import { ErrorList, GeneratorError, ParserError, PicolError } from './error';
import { ParseNode, ParseNodeType, ParseOperatorType } from './parser-node';
import {
  Quadruple, QuadrupleArg, QuadrupleArgArrayAddr, QuadrupleArgNull, QuadrupleArgQuadRef,
  QuadrupleArgTableRef, QuadrupleArgType, QuadrupleArgValue, QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
import {
createValueType, getPrimitiveSize, SymbolEntryInfo, SymbolEntryType, ValueType, ValueTypeInfo,
} from './symbol-entry';
import { PrimitiveType, Token } from './token';

const ARRAY_ADDR_OFFSET = 0;
const ARRAY_DIM_DEF_OFFSET = ARRAY_ADDR_OFFSET + getPrimitiveSize('ref');

const Q_NULL = QuadrupleArgNull.Q_NULL;

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
    expr.entryType = createValueType.prim(PrimitiveType.BOOL);
    return expr;
  }

  public static newPrimValue(type: PrimitiveType, value: any): AttrExpr {
    const quadValue = new QuadrupleArgValue(type, value);
    console.log('set value type as ' + PrimitiveType[type]);
    return new AttrExpr(quadValue, createValueType.prim(type));
  }

  public static newQuadrupleRef(value: QuadrupleArg, type: ValueTypeInfo): AttrExpr {
    // simple wrapper for the original value
    return new AttrExpr(value, type);
  }

  public isValid = true;
  public isBoolean = false;
  public generatedValue: QuadrupleArg | undefined;
  public trueChain = 0;
  public falseChain = 0;
  public entryType: ValueTypeInfo;

  private constructor(value?: QuadrupleArg, type?: ValueTypeInfo) {
    this.generatedValue = value;
    if (type) {
      this.entryType = type;
    }
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
      'convert value to boolean: value is truly');
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
      'convert value to boolean: value is falsy');
  }

  // convert boolean chain to value
  public toValue(ctx: GeneratorContext): QuadrupleArg {
    if (!this.isBoolean) {
      if (this.value.type === QuadrupleArgType.ARRAY_ADDR) {
        const arrayTemp = ctx.getTempVar();
        ctx.addQuadruple(QuadrupleOperator.A_RET, this.value, Q_NULL, arrayTemp, 'retrieve value of array reference');
        return arrayTemp;
      }
      return this.value;
    }
    const temp = ctx.getTempVar();
    const nxq = ctx.nextQuadrupleIndex;

    // nxq
    ctx.addQuadruple(QuadrupleOperator.V_ASS, new QuadrupleArgValue(PrimitiveType.BOOL, true),
      Q_NULL, temp, 'convert boolean to value: true');
    // nxq + 1
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL,
      new QuadrupleArgQuadRef(nxq + 3), 'convert boolean to value: jump');
    // nxq + 2
    ctx.addQuadruple(QuadrupleOperator.V_ASS, new QuadrupleArgValue(PrimitiveType.BOOL, false),
      Q_NULL, temp, 'convert boolean to value: false');
    // nxq + 3

    ctx.backPatchChain(this.trueChain, nxq);
    ctx.backPatchChain(this.falseChain, nxq + 2);
    this.trueChain = this.falseChain = 0;
    this.isBoolean = false;
    this.generatedValue = temp;
    return this.value;
  }

  public toRef(ctx: GeneratorContext, token?: Token): QuadrupleArg {
    if (this.isBoolean) {
      throw new GeneratorError('boolean cannot be used as reference value', undefined);
    }
    switch (this.value.type) {
      case QuadrupleArgType.TABLE_REF: // direct table reference
      case QuadrupleArgType.ARRAY_ADDR:  // indirect array reference
        return this.value;
      case QuadrupleArgType.VAR_TEMP: // temporary variable cannot be used as reference for assignment
      case QuadrupleArgType.NULL: // null value cannot be written
      case QuadrupleArgType.VALUE_INST: // instance value cannot be written
      default:
        throw new GeneratorError('value cannot be used as reference', token);
    }
  }
}

const attr = {
  valid: (): IAttr => ({ isValid: true }),
};

const getItemType = (node: ParseNode): ValueTypeInfo => {
  switch (node.type) {
    case ParseNodeType.TYPE_ARRAY:
      return createValueType.arr(node.children[0].children[0].value, node.children[0].children[1].children.length);
    case ParseNodeType.TYPE_ARRAY_REF:
      return createValueType.arrRef(node.children[0].value, node.value);
    case ParseNodeType.TYPE_PRIMITIVE:
      return createValueType.prim(node.value);
  }
  return createValueType.void();
};

const addTypeConversion = (ctx: GeneratorContext, src: AttrExpr, dstType: PrimitiveType, token?: Token):
  QuadrupleArg => {
  const srcType = src.entryType.primitiveType;

  if (srcType === dstType) {
    return src.toValue(ctx);
  }

  if (srcType === PrimitiveType.INT && dstType === PrimitiveType.FLOAT) {
    const tempVar = ctx.getTempVar();
    ctx.addQuadruple(QuadrupleOperator.C_I2F, src.toValue(ctx), Q_NULL, tempVar);
    return tempVar;
  }

  if (srcType === PrimitiveType.INT && dstType === PrimitiveType.INT) {
    const tempVar = ctx.getTempVar();
    ctx.err.warn(new GeneratorError('precision loss in type conversion from int to char', token));
    ctx.addQuadruple(QuadrupleOperator.C_I2C, src.toValue(ctx), Q_NULL, tempVar);
    return tempVar;
  }

  if (srcType === PrimitiveType.FLOAT && dstType === PrimitiveType.INT) {
    const tempVar = ctx.getTempVar();
    ctx.err.warn(new GeneratorError('precision loss in type conversion from float to int', token));
    ctx.addQuadruple(QuadrupleOperator.C_F2I, src.toValue(ctx), Q_NULL, tempVar);
    return tempVar;
  }

  if (srcType === PrimitiveType.CHAR && dstType === PrimitiveType.INT) {
    const tempVar = ctx.getTempVar();
    ctx.err.warn(new GeneratorError('implicit type conversion from char to int', token));
    ctx.addQuadruple(QuadrupleOperator.C_C2I, src.toValue(ctx), Q_NULL, tempVar);
    return tempVar;
  }

  if (dstType === PrimitiveType.BOOL) {
    // conversion via truly & falsy comparison
    ctx.err.warn(new GeneratorError('precision loss in type conversion to boolean value', token));
    src.toBoolean(ctx);
    return src.toValue(ctx);
  }

  ctx.err.error(new GeneratorError('no viable conversion exists from '
    + PrimitiveType[srcType] + ' to ' + PrimitiveType[dstType], token));
  return src.toValue(ctx);
};

type generateRule<T extends IAttr> = (ctx: GeneratorContext, node: ParseNode, newContext?: boolean) => T;

const assign = (ctx: GeneratorContext, val: QuadrupleArg, target: AttrExpr, token?: Token) => {
  const ref = target.toRef(ctx, token);
  if (ref.type === QuadrupleArgType.TABLE_REF) {
    // Value assignment
    ctx.addQuadruple(QuadrupleOperator.V_ASS, val, Q_NULL, ref);
  } else if (ref.type === QuadrupleArgType.ARRAY_ADDR) {
    ctx.addQuadruple(QuadrupleOperator.A_ASS, val, Q_NULL, ref);
  }
};

const generateExpressionUnary: generateRule<AttrExpr> = (ctx, node) => {
  // boolean operand
  const operand = generateExpression(ctx, node.children[0]);
  if (node.value === ParseOperatorType.UNI_NOT) {
    operand.toBoolean(ctx);
    return AttrExpr.newBoolExpr(operand.falseChain, operand.trueChain);
  }

  // value operand
  const opVal = operand.toValue(ctx);

  // Unary posit operation
  if (node.value === ParseOperatorType.UNI_POSIT) {
    if (operand.entryType.type !== ValueType.PRIMITIVE) {
      ctx.err.error(new GeneratorError('posit operator can only be applied to primitive type', node.token));
      return AttrExpr.newQuadrupleRef(opVal, new ValueTypeInfo(PrimitiveType.INT));
    }
    if (operand.entryType.primitiveType === PrimitiveType.BOOL) {
      ctx.err.info(new GeneratorError('implicit conversion from bool to int', node.token));
      return AttrExpr.newQuadrupleRef(opVal, new ValueTypeInfo(PrimitiveType.INT));
    }
    return AttrExpr.newQuadrupleRef(opVal, operand.entryType);
  }

  // Unary negate operation
  if (node.value === ParseOperatorType.UNI_NEGATE) {
    if (operand.entryType.type !== ValueType.PRIMITIVE) {
      ctx.err.error(new GeneratorError('negate operator can only be applied to primitive type', node.token));
      return AttrExpr.newQuadrupleRef(opVal, new ValueTypeInfo(PrimitiveType.INT));
    }
    if (operand.entryType.primitiveType === PrimitiveType.BOOL) {
      ctx.err.error(new GeneratorError('negate operator cannot be applied to bool', node.token));
      return AttrExpr.newQuadrupleRef(opVal, new ValueTypeInfo(PrimitiveType.INT));
    }
    const invTemp = ctx.getTempVar();
    if (operand.entryType.primitiveType === PrimitiveType.FLOAT) {
      ctx.addQuadruple(QuadrupleOperator.R_SUB, new QuadrupleArgValue(PrimitiveType.FLOAT, 0), opVal, invTemp);
    } else {
      ctx.addQuadruple(QuadrupleOperator.I_SUB, new QuadrupleArgValue(PrimitiveType.INT, 0), opVal, invTemp);
    }
    return AttrExpr.newQuadrupleRef(invTemp, operand.entryType);
  }

  // Self-increment / decrement
  const temp = ctx.getTempVar();
  let temp2: QuadrupleArg | undefined;
  const Q_ZERO_I = new QuadrupleArgValue(PrimitiveType.INT, 0);
  const Q_ONE_I = new QuadrupleArgValue(PrimitiveType.INT, 1);
  const Q_ZERO_F = new QuadrupleArgValue(PrimitiveType.FLOAT, 0);
  const Q_ONE_F = new QuadrupleArgValue(PrimitiveType.FLOAT, 1);

  // following operations are all requires to be performed on numbers
  // and the type of the result is the same as the parameter (float, char, int)
  // bool will cause compiling error
  if (operand.entryType.primitiveType === PrimitiveType.BOOL) {
    ctx.err.error(new GeneratorError('self-increment/decrement operator cannot be applied to bool', node.token));
    return AttrExpr.newQuadrupleRef(opVal, operand.entryType);
  }

  if (operand.entryType.primitiveType === PrimitiveType.FLOAT) {
    switch (node.value) {
      case ParseOperatorType.UNI_INC_PRE:
        ctx.addQuadruple(QuadrupleOperator.R_ADD, opVal, Q_ONE_F, temp);
        assign(ctx, temp, operand, node.children[0].token);
        break;
      case ParseOperatorType.UNI_INC_POS:
        ctx.addQuadruple(QuadrupleOperator.R_ADD, opVal, Q_ZERO_F, temp);
        temp2 = ctx.getTempVar();
        ctx.addQuadruple(QuadrupleOperator.R_ADD, temp, Q_ONE_F, temp2);
        assign(ctx, temp2, operand, node.children[0].token);
        break;
      case ParseOperatorType.UNI_DEC_PRE:
        ctx.addQuadruple(QuadrupleOperator.R_SUB, opVal, Q_ONE_F, temp);
        assign(ctx, temp, operand, node.children[0].token);
        break;
      case ParseOperatorType.UNI_DEC_POS:
        ctx.addQuadruple(QuadrupleOperator.R_ADD, opVal, Q_ZERO_F, temp);
        temp2 = ctx.getTempVar();
        ctx.addQuadruple(QuadrupleOperator.R_SUB, temp, Q_ONE_F, temp2);
        assign(ctx, temp2, operand, node.children[0].token);
        break;
      default:
        ctx.err.error(new GeneratorError('unknown unary operator', node.token));
    }
  } else {
    switch (node.value) {
      case ParseOperatorType.UNI_INC_PRE:
        ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, Q_ONE_I, temp);
        assign(ctx, temp, operand, node.children[0].token);
        break;
      case ParseOperatorType.UNI_INC_POS:
        ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, Q_ZERO_I, temp);
        temp2 = ctx.getTempVar();
        ctx.addQuadruple(QuadrupleOperator.I_ADD, temp, Q_ONE_I, temp2);
        assign(ctx, temp2, operand, node.children[0].token);
        break;
      case ParseOperatorType.UNI_DEC_PRE:
        ctx.addQuadruple(QuadrupleOperator.I_SUB, opVal, Q_ONE_I, temp);
        assign(ctx, temp, operand, node.children[0].token);
        break;
      case ParseOperatorType.UNI_DEC_POS:
        ctx.addQuadruple(QuadrupleOperator.I_ADD, opVal, Q_ZERO_I, temp);
        temp2 = ctx.getTempVar();
        ctx.addQuadruple(QuadrupleOperator.I_SUB, temp, Q_ONE_I, temp2);
        assign(ctx, temp2, operand, node.children[0].token);
        break;
      default:
        ctx.err.error(new GeneratorError('unknown unary operator', node.token));
    }
  }

  return AttrExpr.newQuadrupleRef(temp, operand.entryType);
};

const generateExpressionBinary: generateRule<AttrExpr> = (ctx, node) => {
  const op: ParseOperatorType = node.value;

  if (op === ParseOperatorType.BIN_LOG_AND || op === ParseOperatorType.BIN_LOG_OR) {
    const isAnd = op === ParseOperatorType.BIN_LOG_AND;

    const logicalLeftOp = generateExpression(ctx, node.children[0]);
    if (logicalLeftOp.entryType.type !== ValueType.PRIMITIVE) {
      ctx.err.error(new GeneratorError('cannot use reference in logical expression', node.children[0].token));
    }
    logicalLeftOp.toBoolean(ctx);
    ctx.backPatchChain(isAnd ? logicalLeftOp.trueChain : logicalLeftOp.falseChain, ctx.nextQuadrupleIndex);

    const logicalRightOp = generateExpression(ctx, node.children[1]);
    if (logicalRightOp.entryType.type !== ValueType.PRIMITIVE) {
      ctx.err.error(new GeneratorError('cannot use reference in logical expression', node.children[1].token));
    }
    logicalRightOp.toBoolean(ctx);
    if (isAnd) {
      // AND operator
      return AttrExpr.newBoolExpr(logicalRightOp.trueChain,
        ctx.mergeChain(logicalLeftOp.falseChain, logicalRightOp.falseChain));
    } else {
      // OR operator
      return AttrExpr.newBoolExpr(ctx.mergeChain(logicalLeftOp.trueChain, logicalRightOp.trueChain),
        logicalRightOp.falseChain);
    }
  }
  const lOp = generateExpression(ctx, node.children[0]);
  const rOp = generateExpression(ctx, node.children[1]);

  if (lOp.entryType.type === ValueType.ARRAY_REF && rOp.entryType.type === ValueType.ARRAY) {
    // TODO: Array reference assignment
  }else if (lOp.entryType.type === ValueType.ARRAY_REF && rOp.entryType.type === ValueType.ARRAY_REF) {
    // TODO: Array reference assignment
  } else if (lOp.entryType.type !== ValueType.PRIMITIVE || rOp.entryType.type !== ValueType.PRIMITIVE) {
    if (lOp.entryType.type !== ValueType.PRIMITIVE) {
      ctx.err.error(new GeneratorError('left operand should be a value', node.children[0].token));
    }
    if (rOp.entryType.type !== ValueType.PRIMITIVE) {
      ctx.err.error(new GeneratorError('right operand should be a value', node.children[1].token));
    }
  }

  const getConversionTargetType = (type1: PrimitiveType, type2: PrimitiveType) => {
    if (type1 === PrimitiveType.FLOAT || type2 === PrimitiveType.FLOAT) {
      return PrimitiveType.FLOAT;
    }

    if (type1 === PrimitiveType.CHAR && type2 === PrimitiveType.CHAR) {
      return PrimitiveType.CHAR;
    }

    if (type1 === PrimitiveType.BOOL && type2 === PrimitiveType.BOOL) {
      return PrimitiveType.BOOL;
    }

    if (type1 === PrimitiveType.INT || type2 === PrimitiveType.INT) {
      return PrimitiveType.INT;
    }

    return PrimitiveType.INT;
  };

  const genRelOperator = (qop: QuadrupleOperator): AttrExpr => {
    const targetType = getConversionTargetType(lOp.entryType.primitiveType, rOp.entryType.primitiveType);
    const lOpValue = addTypeConversion(ctx, lOp, targetType, node.children[0].token);
    const rOpValue = addTypeConversion(ctx, rOp, targetType, node.children[1].token);
    if (targetType === PrimitiveType.BOOL && qop !== QuadrupleOperator.J_EQ && qop !== QuadrupleOperator.J_NE) {
      ctx.err.error(new GeneratorError('only equal and not-equal comparison can be applied to bool values',
        node.token));
    }
    const boolExpr = AttrExpr.newBoolExpr(ctx.nextQuadrupleIndex, ctx.nextQuadrupleIndex + 1);
    ctx.addQuadruple(qop, lOpValue, rOpValue, new QuadrupleArgQuadRef(0));
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0));
    return boolExpr;
  };

  const genAssOperator = (assOp: QuadrupleOperator): AttrExpr => {
    const value = addTypeConversion(ctx, rOp, lOp.entryType.primitiveType, node.token);
    const temp = ctx.getTempVar();
    ctx.addQuadruple(assOp, lOp.toRef(ctx, node.children[0].token), value, temp);
    assign(ctx, temp, lOp, node.children[0].token);

    // the type of the result is the same as the value stored in the
    // variable, thus the type is determined by lOp
    return AttrExpr.newQuadrupleRef(temp, lOp.entryType);
  };

  const convertIntOperatorToFloat = (intOp: QuadrupleOperator): QuadrupleOperator => {
    switch (intOp) {
      case QuadrupleOperator.I_ADD: return QuadrupleOperator.R_ADD;
      case QuadrupleOperator.I_SUB: return QuadrupleOperator.R_SUB;
      case QuadrupleOperator.I_MUL: return QuadrupleOperator.R_MUL;
      case QuadrupleOperator.I_ADD: return QuadrupleOperator.R_DIV;
    }
    return intOp;
  };

  const genIntOperator = (intOp: QuadrupleOperator): AttrExpr => {
    if (lOp.entryType.primitiveType === PrimitiveType.FLOAT || rOp.entryType.primitiveType === PrimitiveType.FLOAT) {
      const floatLeftOp = addTypeConversion(ctx, lOp, PrimitiveType.FLOAT, node.children[0].token);
      const floatRightOp = addTypeConversion(ctx, rOp, PrimitiveType.FLOAT, node.children[1].token);
      const temp = ctx.getTempVar();
      ctx.addQuadruple(convertIntOperatorToFloat(intOp), floatLeftOp, floatRightOp, temp);
      return AttrExpr.newQuadrupleRef(temp, createValueType.prim(PrimitiveType.FLOAT));
    } else {
      const intLeftOp = addTypeConversion(ctx, lOp, PrimitiveType.INT, node.children[0].token);
      const intRightOp = addTypeConversion(ctx, rOp, PrimitiveType.INT, node.children[1].token);
      const temp = ctx.getTempVar();
      ctx.addQuadruple(intOp, intLeftOp, intRightOp, temp);
      return AttrExpr.newQuadrupleRef(temp, createValueType.prim(PrimitiveType.INT));
    }
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
    case ParseOperatorType.BIN_ASS_VAL: {
      const value = addTypeConversion(ctx, rOp, lOp.entryType.primitiveType, node.token);
      assign(ctx, value, lOp, node.children[0].token);
      return AttrExpr.newQuadrupleRef(lOp.toRef(ctx, node.children[0].token), lOp.entryType);
    }

    case ParseOperatorType.BIN_REL_EQ: return genRelOperator(QuadrupleOperator.J_EQ);
    case ParseOperatorType.BIN_REL_GT: return genRelOperator(QuadrupleOperator.J_GT);
    case ParseOperatorType.BIN_REL_GTE: return genRelOperator(QuadrupleOperator.J_GTE);
    case ParseOperatorType.BIN_REL_LT: return genRelOperator(QuadrupleOperator.J_LT);
    case ParseOperatorType.BIN_REL_LTE: return genRelOperator(QuadrupleOperator.J_LTE);
    case ParseOperatorType.BIN_REL_NE: return genRelOperator(QuadrupleOperator.J_NE);
    default:
      throw new GeneratorError('unknown operator', node.token);
  }
};

const generateExpressionFuncInvoke: generateRule<AttrExpr> = (ctx, node) => {
  const funcNameNode = node.children[0];
  const funcNameStatus = ctx.checkName(funcNameNode.value);
  if (!funcNameStatus.isDefined) {
    ctx.err.error(new GeneratorError('function "' + funcNameNode.value + '" is not defined', funcNameNode.token));
    ctx.err.warn(new GeneratorError('function result is assumed as an temporary variable', funcNameNode.token));
    // undefined variable, assumed as an integer
    return AttrExpr.newQuadrupleRef(ctx.getTempVar(), createValueType.prim(PrimitiveType.INT));
  }
  if (funcNameStatus.entry && funcNameStatus.entry.type !== SymbolEntryType.FUNCTION) {
    ctx.err.error(new GeneratorError('variable identifier ' + funcNameNode.value + ' cannot be used as function',
      funcNameNode.token));
    return AttrExpr.newQuadrupleRef(ctx.getEntry(funcNameNode.value), funcNameStatus.entry.info as ValueTypeInfo);
  }
  const funcInfo = ctx.getEntryInfo(node.children[0].value).asFunc;
  const argList = node.children[1].children;

  // new frame is based on the top of last stack
  const funcFrameBase = ctx.currentHeapTop;
  let funcFrame = funcFrameBase;

  funcFrame += getPrimitiveSize(PrimitiveType.INT); // Skip parent frame top (apply this when return this function)
  // TODO: display table
  funcFrame += getPrimitiveSize(PrimitiveType.INT); // Skip return address (Quadruple Index)

  // heap address for return value retrieval
  const returnVal = new QuadrupleArgArrayAddr(Q_NULL, new QuadrupleArgValue(PrimitiveType.INT, funcFrame));
  funcFrame += funcInfo.returnType.size; // Skip return value

  if (argList.length !== funcInfo.parameterList.length) {
    ctx.err.error(new GeneratorError('the number of arguments mismatches to the number of parameter',
      node.children[0].token));
  }

  argList.forEach((arg, ind) => {
    const val = generateExpression(ctx, arg);
    const target = new QuadrupleArgArrayAddr(Q_NULL, new QuadrupleArgValue(PrimitiveType.INT, funcFrame));

    const paraInfo = funcInfo.parameterList[ind];
    if (paraInfo) {
      funcFrame += paraInfo.type.size;
      const targetVal = addTypeConversion(ctx, val, paraInfo.type.primitiveType, arg.token);
      ctx.addQuadruple(QuadrupleOperator.F_PARA, targetVal, Q_NULL, target);
    } else {
      ctx.err.error(new GeneratorError('this argument exceeds the parameter count',
        arg.token));
    }
  });

  const funcFrameBaseArg = new QuadrupleArgValue(PrimitiveType.INT, funcFrameBase);
  ctx.addQuadruple(QuadrupleOperator.F_FUNC, funcFrameBaseArg, Q_NULL, ctx.getEntry(funcNameNode.value));

  // no return value
  if (funcInfo.returnType.isVoid) {
    return AttrExpr.newPrimValue(PrimitiveType.VOID, undefined);
  }

  // retrieve return value into temporary variable
  const temp = ctx.getTempVar();
  ctx.addQuadruple(QuadrupleOperator.F_VAL, returnVal, Q_NULL, temp);

  // result of function invocation is determined by the return type of function
  return AttrExpr.newQuadrupleRef(temp, funcInfo.returnType);
};

const generateExpressionArrAccess: generateRule<AttrExpr> = (ctx, node) => {
  const id = node.children[0].value;
  const arrayInfo = ctx.getEntryInfo(id);

  // assert the compatibility of size
  if (node.children[1].children.length !== arrayInfo.asArr.dimension) {
    ctx.err.error(new GeneratorError('incompatible array dimension for array access', node.token));
  }

  let addrOffset: QuadrupleArg | undefined;
  node.children[1].children.map((dimNode, index) => {
    const dimAttr = generateExpression(ctx, dimNode);
    const dimAttrValue = addTypeConversion(ctx, dimAttr, PrimitiveType.INT, dimNode.token);
    const arrLenRef = new QuadrupleArgArrayAddr(ctx.getEntry(id),
      new QuadrupleArgValue(PrimitiveType.INT, ARRAY_DIM_DEF_OFFSET + index * getPrimitiveSize(PrimitiveType.INT)));
    if (addrOffset) {
      const arrLen = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.A_RET, arrLenRef, Q_NULL, arrLen,
        'retrieve array size of ' + index + ' dimension');
      const multiOffset = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_MUL, addrOffset, arrLen, multiOffset, 'multiply dim size');
      const addOffset = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_ADD, multiOffset, dimAttrValue, addOffset, 'add dim offset');
      addrOffset = addOffset;
    } else {
      // first dimension
      addrOffset = dimAttrValue;
    }
  });
  if (!addrOffset) {
    ctx.err.error(new GeneratorError('empty array index list', node.token));
    addrOffset = Q_NULL;
  }

  const totalOffset = ctx.getTempVar();
  const elementSize = arrayInfo.asArr.elementSize;
  ctx.addQuadruple(QuadrupleOperator.I_MUL, addrOffset, new QuadrupleArgValue(PrimitiveType.INT, elementSize),
    totalOffset, 'calc total size');

  const addrRef = new QuadrupleArgArrayAddr(ctx.getEntry(id),
    new QuadrupleArgValue(PrimitiveType.INT, ARRAY_ADDR_OFFSET));
  const addrTemp = ctx.getTempVar();
  ctx.addQuadruple(QuadrupleOperator.A_RET, addrRef, Q_NULL, addrTemp, 'retrieve array base address at heap');

  return AttrExpr.newQuadrupleRef(new QuadrupleArgArrayAddr(addrTemp, totalOffset),
    createValueType.prim(arrayInfo.asArr.primitiveType));
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
    case ParseNodeType.VAL_IDENTIFIER: {
      const nameStatue = ctx.checkName(node.value);
      if (!nameStatue.isDefined) {
        ctx.err.error(new GeneratorError('variable "' + node.value + '" is not defined', node.token));
        ctx.err.warn(new GeneratorError('variable is assumed as an temporary variable', node.token));
        // undefined variable, assumed as an integer
        return AttrExpr.newQuadrupleRef(ctx.getTempVar(), createValueType.prim(PrimitiveType.INT));
      } else {
        // the type of the entry is the same as the table entry
        const symbolEntry = ctx.getEntryInfo(node.value);
        if (symbolEntry.type === SymbolEntryType.FUNCTION) {
          ctx.err.error(new GeneratorError('cannot use function identifier as variable', node.token));
          // use return type for function
          return AttrExpr.newQuadrupleRef(ctx.getEntry(node.value), symbolEntry.asFunc.returnType);
        }
        return AttrExpr.newQuadrupleRef(ctx.getEntry(node.value), symbolEntry.info as ValueTypeInfo);
      }
    }
    case ParseNodeType.VAL_UNINITIALIZED:
    default:
      return AttrExpr.newPrimValue(PrimitiveType.VOID, null);
  }
};

const generateDeclarationPrimitive: generateRule<IAttr> = (ctx, node) => {
  const type: PrimitiveType = node.children[0].value as PrimitiveType;
  const declItems = node.children[1].children.map((i) => {
    const name = i.children[0].value;

    const nameStatus = ctx.checkName(name);
    if (nameStatus.isDefined && nameStatus.currentContext) {
      ctx.err.error(new GeneratorError('variable is defined ' + name, i.children[0].token));
    } else {
      // for redefinition, use the first definition
      ctx.addEntry.prim(name, type, i.children[0].position);
    }

    const ref = ctx.getEntry(name);

    if (i.children[1].type === ParseNodeType.VAL_UNINITIALIZED) {
      // TODO: manage default value in central place
      // const defaultValue = getDefaultValue(type);
      ctx.addQuadruple(QuadrupleOperator.V_ASS,
        new QuadrupleArgValue(PrimitiveType.INT, 0),
        Q_NULL,
        ref,
        'default initialization',
      );
    } else {
      const value = generateExpression(ctx, i.children[1]);
      const targetValue = addTypeConversion(ctx, value, type, i.token);
      ctx.addQuadruple(QuadrupleOperator.V_ASS, targetValue, Q_NULL, ref);
    }
    return { name: i.children[0]};
  });
  return attr.valid();
};

const generateDeclarationArray: generateRule<IAttr> = (ctx, node) => {

  const arrType = node.children[0];
  const primitiveType = arrType.children[0].value as PrimitiveType;
  const arrDimensionDef = arrType.children[1];
  const arrayName = node.children[1].value;

  const nameStatus = ctx.checkName(arrayName);
  if (nameStatus.isDefined && nameStatus.currentContext) {
    ctx.err.error(new GeneratorError('name redefinition:' + name, node.children[1].token));
    // stop processing this item
    return attr.valid();
  }

  ctx.addEntry.arr(arrayName, primitiveType,
    arrDimensionDef.children.length, node.children[1].position);
  const arrEntryInfo = ctx.getEntryInfo(arrayName).asArr;

  let size: QuadrupleArg | undefined;
  arrDimensionDef.children.map((dim, index) => {
    const dimExpr = generateExpression(ctx, dim);
    const dimRef = new QuadrupleArgArrayAddr(ctx.getEntry(arrayName),
      new QuadrupleArgValue(PrimitiveType.INT, index * getPrimitiveSize(PrimitiveType.INT) + ARRAY_DIM_DEF_OFFSET));
    const dimExprValue = addTypeConversion(ctx, dimExpr, PrimitiveType.INT, dim.token);
    ctx.addQuadruple(QuadrupleOperator.A_ASS, dimExprValue,
      Q_NULL, dimRef, 'Set array size of ' + index + ' dimension');
    if (size) {
      const temp = ctx.getTempVar();
      ctx.addQuadruple(QuadrupleOperator.I_MUL, size, dimExpr.toValue(ctx), temp, 'calc array size');
      size = temp;
    } else {
      size = dimExpr.toValue(ctx);
    }
  });
  if (!size) {
    ctx.err.error(new GeneratorError('empty array dimension', arrDimensionDef.token));
    size = Q_NULL;
  }

  const totalSize = ctx.getTempVar();
  const elementSize = arrEntryInfo.elementSize;
  ctx.addQuadruple(QuadrupleOperator.I_MUL, size, new QuadrupleArgValue(PrimitiveType.INT, elementSize),
    totalSize, 'calc total size');

  const addrRef = new QuadrupleArgArrayAddr(ctx.getEntry(arrayName),
    new QuadrupleArgValue(PrimitiveType.INT, ARRAY_ADDR_OFFSET));
  const heapAddr = ctx.getTempVar();
  ctx.addQuadruple(QuadrupleOperator.M_REQ, totalSize, Q_NULL, heapAddr, 'request memory allocation');
  ctx.addQuadruple(QuadrupleOperator.A_ASS, heapAddr, Q_NULL, addrRef, 'save dynamic array address');
  return attr.valid();
};

const generateDeclarationArrayRef: generateRule<IAttr> = (ctx, node) => {
  const type = node.children[0].children[0].value;
  const dim = node.children[0].value as number;
  const declItems = node.children[1].children.map((i) => {
    const name = i.children[0].value;

    const nameStatus = ctx.checkName(name);
    if (nameStatus.isDefined && nameStatus.currentContext) {
      ctx.err.error(new GeneratorError('variable redefinition', i.children[0].token));
    } else {
      ctx.addEntry.arrRef(name, type, dim, i.children[0].position);
    }

    const ref = ctx.getEntry(name);
    if (i.children[1].type === ParseNodeType.VAL_UNINITIALIZED) {
      // const defaultValue = getDefaultValue(type);
      ctx.addQuadruple(QuadrupleOperator.A_ASS,
        new QuadrupleArgValue(PrimitiveType.INT, undefined),
        Q_NULL,
        ref,
        'default initialization',
      );
    } else {
      const value = generateExpression(ctx, i.children[1]);
      ctx.addQuadruple(QuadrupleOperator.R_ASS, value.toValue(ctx), Q_NULL, ref);
    }
  });
  return attr.valid();
};

const generateFunction: generateRule<IAttr> = (ctx, node) => {
  const name = node.children[0].value;

  const nameStatus = ctx.checkName(name);
  if (nameStatus.isDefined && nameStatus.currentContext) {
    ctx.err.error(new GeneratorError('name redefinition: ' + name, node.children[0].token));
  } else {
     // function name is exposed outside of function block
    ctx.addEntry.func(name, node.position);
  }

  // wrap in function block context
  ctx.wrapInContext('Function: ' + name, {
    isFunction: true,
  }, () => {
    const functionInfo = ctx.getEntryInfo(name).asFunc;

    ctx.addEntry.prim('?ppc', PrimitiveType.INT, null);
    ctx.addEntry.prim('?addr', PrimitiveType.INT, null);

    // return value
    const returnType = getItemType(node.children[1]);
    functionInfo.returnType = returnType;
    // allocate address for return value, no space allocated for void function
    // return is allocated after parameter
    if (returnType.type === ValueType.ARRAY_REF) {
      ctx.addEntry.arrRef('?ret', returnType.primitiveType, returnType.dim, null);
    } else if (returnType.type === ValueType.PRIMITIVE) {
      ctx.addEntry.prim('?ret', returnType.primitiveType, null);
    }

    // parameters
    node.children[2].children.map((item) => {
      const parameter = {
        name: item.children[1].value,
        type: getItemType(item.children[0]),
      };

      if (functionInfo.parameterList.some((p) => p.name === parameter.name)) {
        // name conflict
        ctx.err.error(new GeneratorError('parameter with same name already defined', item.children[1].token));
      } else {
        // add argument to function block
        if (parameter.type.type === ValueType.ARRAY_REF) {
          ctx.addEntry.arrRef(parameter.name, parameter.type.primitiveType,
            parameter.type.dim, item.children[1].position);
        } else if (parameter.type.type === ValueType.PRIMITIVE) {
          ctx.addEntry.prim(parameter.name, parameter.type.primitiveType, item.children[1].position);
        }
        functionInfo.parameterList.push(parameter);
      }
    });

    // jump to skip function quadruples
    const funcSkipChain = ctx.nextQuadrupleIndex;
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0), 'skip function ' + name);

    // next quadruple is the entry of the function
    functionInfo.entryAddress = ctx.nextQuadrupleIndex;
    const statementAttr = generateStatementSequence(ctx, node.children[3], false);

    // tail return generation (void return)
    ctx.backPatchChain(statementAttr.chain, ctx.nextQuadrupleIndex);
    ctx.addQuadruple(QuadrupleOperator.F_RET, Q_NULL, Q_NULL, Q_NULL, 'generated return'); // Return generation policy

    // continue normal context
    ctx.backPatchChain(funcSkipChain, ctx.nextQuadrupleIndex);
  });

  return attr.valid();
};

const generateStatementIf: generateRule<AttrStat> = (ctx, node) => {
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);
  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied

  ctx.pushContext('if-then block');
  const body = generateStatement(ctx, node.children[1], false);
  ctx.popContext();

  const chain = ctx.mergeChain(condition.falseChain, body.chain);
  return new AttrStat(chain);
};

const generateStatementIfElse: generateRule<AttrStat> = (ctx, node) => {
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);

  ctx.pushContext('if-then-else block: then');
  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied
  const bodyThen = generateStatement(ctx, node.children[1], false);
  const jumpChain = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
    'end of if-then block');
  bodyThen.chain = ctx.mergeChain(bodyThen.chain, jumpChain);
  ctx.popContext();

  ctx.pushContext('if-then-else block else');
  ctx.backPatchChain(condition.falseChain, ctx.nextQuadrupleIndex); // condition satisfied
  const bodyElse = generateStatement(ctx, node.children[2], false);
  ctx.popContext();

  const chain = ctx.mergeChain(bodyThen.chain, bodyElse.chain);
  return new AttrStat(chain);
};

const generateStatementSequence: generateRule<AttrStat> = (ctx, node, newContext = true) => {
  // use an boolean indicator to check denote whether an new execution context will be generated
  // when processing this code sequence
  // For if/while/do/func etc, a new execution context is already generated before entering this block
  if (newContext !== false) {
    ctx.pushContext('block');
  }
  const chain = node.children.reduce((lastChain, stat) => {
    ctx.backPatchChain(lastChain, ctx.nextQuadrupleIndex);
    return generateStatement(ctx, stat).chain;
  }, 0);
  if (newContext !== false) {
    ctx.popContext();
  }
  return new AttrStat(chain);
};

const generateStatementWhile: generateRule<AttrStat> = (ctx, node) => {
  ctx.pushContext('while loop');
  // while statement can embrace break and continue
  ctx.pushBreakChain(0);
  ctx.pushContinueChain(0);

  const beginNxq = ctx.nextQuadrupleIndex;
  const condition = generateExpression(ctx, node.children[0]);
  condition.toBoolean(ctx);
  ctx.backPatchChain(condition.trueChain, ctx.nextQuadrupleIndex); // condition satisfied
  const body = generateStatement(ctx, node.children[1], false);

  const jumpChain = ctx.nextQuadrupleIndex;
  ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL, new QuadrupleArgQuadRef(0),
    'end of while loop');
  body.chain = ctx.mergeChain(body.chain, jumpChain);

  ctx.backPatchChain(body.chain, beginNxq);

  const breakChain = ctx.popBreakChain();
  const continueChain = ctx.popContinueChain();

  ctx.backPatchChain(continueChain, beginNxq);
  const exitChain = ctx.mergeChain(condition.falseChain, breakChain);

  ctx.popContext();
  return new AttrStat(exitChain);
};

const generateStatementDo: generateRule<AttrStat> = (ctx, node) => {
  ctx.pushContext('do loop');
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

  ctx.popContext();
  return new AttrStat(exitChain);
};

const generateStatementSwitch: generateRule<AttrStat> = (ctx, node) => {
  ctx.pushContext('switch block');
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
  ctx.popContext(); // labels are excluded from current context

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
  const exprAttr = generateExpression(ctx, node.children[0]);
  const retValStatus = ctx.checkName('?ret');
  if (!retValStatus.isDefined || !retValStatus.entry) {
    ctx.err.error(new GeneratorError('return statement is only valid inside an function scope', node.token));
    return attr.valid();
  }
  const retValInfo = retValStatus.entry;
  const retVal = ctx.getEntry('?ret');
  if ( retValInfo.asPrim.primitiveType === PrimitiveType.VOID) {
    ctx.err.error(new GeneratorError('return statement cannot contain return value for void function', node.token));
    ctx.addQuadruple(QuadrupleOperator.F_RET, Q_NULL, Q_NULL, Q_NULL);
    return attr.valid();
  }
  const attrValue = addTypeConversion(ctx, exprAttr, retValInfo.asPrim.primitiveType, node.token);
  ctx.addQuadruple(QuadrupleOperator.V_ASS, attrValue, Q_NULL, retVal);
  ctx.addQuadruple(QuadrupleOperator.F_RET, Q_NULL, Q_NULL, Q_NULL);
  return attr.valid();
};

const generateStatementReturnVoid: generateRule<IAttr> = (ctx, node) => {
  const retValStatus = ctx.checkName('?ret');
  if (!retValStatus.isDefined || !retValStatus.entry) {
    ctx.err.error(new GeneratorError('return statement is only valid inside an function scope', node.token));
    return attr.valid();
  }
  const retValInfo = retValStatus.entry;
  const retVal = ctx.getEntry('?ret');
  if ( retValInfo.asPrim.primitiveType !== PrimitiveType.VOID) {
    ctx.err.error(new GeneratorError('return statement must contain a return value for non-void function', node.token));
    ctx.addQuadruple(QuadrupleOperator.F_RET, Q_NULL, Q_NULL, Q_NULL);
    return attr.valid();
  }
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

const generateStatement: generateRule<AttrStat> = (ctx, node, newContext) => {
  switch (node.type) {
    case ParseNodeType.STAT_IF:
      return generateStatementIf(ctx, node);
    case ParseNodeType.STAT_IF_ELSE:
      return generateStatementIfElse(ctx, node);
    case ParseNodeType.STAT_SEQUENCE:
      return generateStatementSequence(ctx, node, newContext);
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
    case ParseNodeType.STAT_DECLARATION_ARR_REF:
      generateDeclarationArrayRef(ctx, node);
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
  ctx.wrapInContext('source root', {}, () => {
    const result = node.children.reduce((lastChain, s) => {
      ctx.backPatchChain(lastChain, ctx.nextQuadrupleIndex);
      return generateStatement(ctx, s).chain;
    }, 0);

    // the end of the source is an infinite loop
    ctx.backPatchChain(result, ctx.nextQuadrupleIndex);
    ctx.addQuadruple(QuadrupleOperator.J_JMP, Q_NULL, Q_NULL,
      new QuadrupleArgQuadRef(ctx.nextQuadrupleIndex, 'end'), 'loop forever');
  });
  return attr.valid();
};

export interface IntermediateContext {
  quadrupleList: Quadruple[];
  contextTree: ExecutionContext;
  errorList: PicolError[];
}

// generate quadruple based on ast
export const generator = (ast: ParseNode): IntermediateContext => {
  if (ast.type !== ParseNodeType.SRC_SOURCE) {
    throw new GeneratorError('root of AST for generator must be a source file', ast.token);
  }
  const ctx = new GeneratorContext();
  try {
    const result = generateSource(ctx, ast);
  } catch (e) {
    console.log(e);
    ctx.err.fatal(e);
  }
  return {
    quadrupleList: ctx.quadrupleTable,
    contextTree: ctx.currentContext,
    errorList: ctx.err.errorList,
  };
};
