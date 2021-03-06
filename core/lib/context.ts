import { buildInFunctions } from './build-in';
import { ErrorList, GeneratorError } from './error';
import {
  Quadruple, QuadrupleArg, QuadrupleArgQuadRef, QuadrupleArgTableRef,
  QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
import { createValueType, SymbolEntry, SymbolEntryType, ValueType, ValueTypeInfo } from './symbol-entry';
import { PrimitiveType, RangePosition } from './token';

interface INameStatus {
  isDefined: boolean;
  currentContext: boolean;
  entry?: SymbolEntry;
}

interface IContextOption {
  isFunction?: boolean;
}

/**
 * Execution context
 *
 * An execution context is a block level unit with dedicated table
 * for definition and attributes of identifiers.
 */
export class ExecutionContext {
  public isFunction: boolean = false;
  public name: string;
  public parent: ExecutionContext | undefined;
  public children: ExecutionContext[] = [];
  public stackPointer: number = 0;
  private nameTable: { [name: string]: SymbolEntry } = {};

  public get isRoot(): boolean {
    return this.parent === undefined;
  }

  constructor(parent?: ExecutionContext, name?: string, isFunctionContext: boolean = false) {
    this.parent = parent;
    this.name = name || '';
    if (isFunctionContext) {
      this.stackPointer = 0;
      this.isFunction = true;
    } else {
      // for normal context, the stack is based on the original one
      this.stackPointer = parent ? parent.stackPointer : 0;
    }
  }

  public addEntry(entry: SymbolEntry) {
    this.nameTable[entry.name] = entry;
    if (entry.type !== SymbolEntryType.FUNCTION) {
      const typeInfo = entry.info as ValueTypeInfo;
      entry.stackOffset = this.stackPointer;
      this.stackPointer += typeInfo.size;
    }
  }

  public getEntry(name: string, recursive: boolean = true): SymbolEntry {
    if (this.nameTable[name]) {
      return this.nameTable[name];
    }
    if (recursive && this.parent) {
      return this.parent.getEntry(name, recursive);
    }
    throw new GeneratorError('no symbol defined with name ' + name +
      '\n please use checkName before getEntry', undefined);
  }

  public checkName(name: string, current: boolean = true): INameStatus {
    if (this.nameTable[name]) {
      return { isDefined: true, currentContext: current, entry: this.nameTable[name] };
    }
    if (!this.parent) {
      return {isDefined: false, currentContext: false};
    }
    return this.parent.checkName(name, false);
  }

  public addChildContext(ctx: ExecutionContext) {
    this.children.push(ctx);
  }

  public dump(indent: number = 0): string {
    const childIndent = indent + 2;
    const indentStr = ' '.repeat(indent);
    return [
      `${indentStr}Context: ` + (this.name || '(unnamed)') ,

      ...Object.getOwnPropertyNames(this.nameTable)
        .filter((n) => n !== '__ob__') // vue may attach an hidden object here
        .map((n, i) =>
        `${indentStr}${i}:${this.nameTable[n].toString()}`),

      ...this.children.map((c) => c.dump(childIndent)),
    ].join('\n');
  }
}

/**
 * Generator Context
 */
export class GeneratorContext {

  public err: ErrorList = new ErrorList();

  /**
   * Temporary variable counter
   * Picol use single shared global counter for temporary variable across one compiling unit
   */
  private tempIndex = 0;

  /**
   * Execution context stack
   * When entering a block level unit, an execution context will be created.
   * When exiting a block level unit, current top execution context will be moved to
   * historic context storage for further analysis or reference (and may be illustrated).
   */
  private contextStack: ExecutionContext[] = [];

  /**
   * The global quadruple list
   */
  private quadrupleList: Quadruple[] = [];

  private breakChain: number[] = [];
  private continueChain: number[] = [];

  public get currentHeapTop(): number {
    return this.currentContext.stackPointer;
  }

  public get currentContext(): ExecutionContext {
    return this.contextStack[this.contextStack.length - 1];
  }

  public get quadrupleTable(): Quadruple[] {
    return this.quadrupleList;
  }

  public get nextQuadrupleIndex(): number {
    return this.quadrupleList.length + 1;
  }

  public constructor() {
    this.createGlobalContext();
  }

  public pushContext(name: string, option: IContextOption = {}) {
    const oldContext = this.currentContext;
    this.contextStack.push(new ExecutionContext(this.currentContext, name, option.isFunction || false));
    oldContext.addChildContext(this.currentContext);
    return this.currentContext;
  }

  public popContext() {
    return this.contextStack.pop();
  }

  public wrapInContext(name: string, option: IContextOption, content: () => void) {
    const ctx = this.pushContext(name, option);
    content();
    const popCtx = this.popContext();
    if (ctx !== popCtx) {
      throw new GeneratorError('inconsistent context state', undefined);
    }
  }

  public get addEntry() {
    return {
      func: (name: string, srcPosition: RangePosition | null) =>
        this.currentContext.addEntry(SymbolEntry.create.func(name, srcPosition)),
      prim: (name: string, type: PrimitiveType, srcPosition: RangePosition | null) =>
        this.currentContext.addEntry(SymbolEntry.create.prim(name, type, srcPosition)),
      arr: (name: string, type: PrimitiveType, dim: number, srcPosition: RangePosition | null) =>
        this.currentContext.addEntry(SymbolEntry.create.arr(name, type, dim, srcPosition)),
      arrRef: (name: string, type: PrimitiveType, dim: number, srcPosition: RangePosition | null) =>
        this.currentContext.addEntry(SymbolEntry.create.arrRef(name, type, dim, srcPosition)),
    };
  }

  public getEntryInfo(name: string): SymbolEntry {
    return this.currentContext.getEntry(name);
  }

  public getEntry(name: string): QuadrupleArgTableRef | QuadrupleArgQuadRef {
    const entryInfo = this.getEntryInfo(name);
    if (entryInfo.type === SymbolEntryType.FUNCTION) {
      return new QuadrupleArgQuadRef(entryInfo.asFunc.entryAddress, entryInfo.name);
    }
    return new QuadrupleArgTableRef(entryInfo.name, entryInfo.stackOffset);
  }

  public checkName(name: string): INameStatus {
    return this.currentContext.checkName(name);
  }

  public addQuadruple(op: QuadrupleOperator, arg1: QuadrupleArg, arg2: QuadrupleArg, result: QuadrupleArg,
                      comment: string = '') {
    const quadruple = new Quadruple(op, arg1, arg2, result, comment);
    this.quadrupleList.push(quadruple);
  }

  /**
   * create new temporary variable
   */
  public getTempVar() {
    return new QuadrupleArgVarTemp(this.tempIndex++);
  }

  /**
   * resolve a chain of quadruples with undetermined jump target
   *
   * @param head is the index of head of unresolved quadruple chain
   * @param target is the jump target to be applied to items within this chain
   */
  public backPatchChain(head: number, target: number) {
    let q = head;
    while (q !== 0) {
      const quadRef = this.quadrupleList[q - 1].result as QuadrupleArgQuadRef;
      q = quadRef.quadIndex;
      quadRef.quadIndex = target;
    }
  }

  /**
   * merge two quadruple chains
   *
   * @param oHead is the index of head of the chain generated earlier
   * @param nHead is the index of head of the chain generated later
   */
  public mergeChain(oHead: number, nHead: number): number {
    if (nHead === 0) {
      // for an empty chain, no merge action is required
      return oHead;
    }
    let q = nHead;
    while (true) {
      const quadRef = this.quadrupleList[q - 1].result as QuadrupleArgQuadRef;
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
      throw new GeneratorError('pop empty break chain context', undefined);
    }
    return chain;
  }

  public mergeIntoBreakChain(chain: number) {
    const len = this.breakChain.length;
    if (len === 0) {
      throw new GeneratorError('no break chain, break statement outside of breakable block', undefined);
    }
    this.breakChain[len - 1] = this.mergeChain(this.breakChain[len - 1], chain);
  }

  public pushContinueChain(head: number = 0) {
    this.continueChain.push(head);
  }

  public popContinueChain(): number {
    const chain = this.continueChain.pop();
    if (chain === undefined) {
      throw new GeneratorError('pop empty break chain context', undefined);
    }
    return chain;
  }
  public mergeIntoContinueChain(chain: number) {
    const len = this.continueChain.length;
    if (len === 0) {
      throw new GeneratorError('no continue chain, continue statement outside of loop block', undefined);
    }
    this.continueChain[len - 1] = this.mergeChain(this.continueChain[len - 1], chain);
  }

  // global context defines items that is predefined by language
  private createGlobalContext() {
    const global = new ExecutionContext(undefined, 'default global');
    this.contextStack.push(global);

    // register build-in functions to global context
    buildInFunctions.map((func) => {
      this.addEntry.func(func.name, null);
      const funcEntry = this.getEntryInfo(func.name).asFunc;
      funcEntry.returnType = func.return;
      funcEntry.entryAddress = func.id;
      funcEntry.parameterList = func.parameters;
    });
  }
}
