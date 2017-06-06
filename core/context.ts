import {GeneratorError} from './error';
import {
  Quadruple, QuadrupleArg, QuadrupleArgQuadRef, QuadrupleArgTableRef,
  QuadrupleArgVarTemp, QuadrupleOperator,
} from './quadruple';
import { PrimitiveType } from './token';

/**
 * Execution context
 *
 * An execution context is a block level unit with dedicated table
 * for definition and attributes of identifiers.
 */
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

/**
 * Generator Context
 */
export class GeneratorContext {
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
      const quadRef = this.quadrupleList[q].result as QuadrupleArgQuadRef;
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
