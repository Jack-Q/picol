import { ParseNode } from './parser-node';
import { Quadruple } from './quadruple';

export class GeneratorContext {
  private quadrupleList: Quadruple[] = [];

  public get quadrupleTable(): Quadruple[] {
    return this.quadrupleList;
  }

  public get nextQuadrupleIndex(): number {
    return this.quadrupleList.length;
  }

}

interface IGeneratorAttribute {
  isValid: boolean;
}

type generateRule<T extends IGeneratorAttribute> = (ctx: GeneratorContext, node: ParseNode) => T;

const generateSource: generateRule<IGeneratorAttribute> = (ctx, node) => {
  return {isValid: true};
};

// generate quadruple based on ast
export const generator = (ast: ParseNode) => {
  const ctx = new GeneratorContext();
  const result = generateSource(ctx, ast);
  return ctx.quadrupleTable;
};
