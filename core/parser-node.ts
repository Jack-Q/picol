import { PrimitiveType } from './token';

export enum ParseOperatorType {
  UNI_PLUS,   // + a
  UNI_NOT,    // ! a
  UNI_MINUS,  // - a

  BIN_ADD,    // a + b
  BIN_MINUS,  // a - b
  BIN_MULTI,  // a * b
  BIN_DIVIDE, // a / b
}

export enum ParseNodeType {
  SRC_SOURCE,

  STAT_DECLARATION_PRIM,
  STAT_DECLARATION_ARR,

  SEG_DECLARATION_LIST,
  SEG_DECLARATION_ITEM,

  TYPE_ARRAY,
  TYPE_PRIMITIVE,

  EXPR_UNI,
  EXPR_BIN,

  VAL_CONSTANT_INT,
  VAL_CONSTANT_FLOAT,
  VAL_CONSTANT_CHAR,
  VAL_CONSTANT_BOOL,
  VAL_IDENTIFIER,
  VAL_UNINITIALIZED, // uninitialized value for declaration
}

export class ParseNode {
  public static createIdentifier(identifier: string) {
    return new ParseNode(ParseNodeType.VAL_IDENTIFIER, identifier);
  }

  public static createDeclarationPrimitive(declareType: ParseNode, declareList: ParseNode) {
    const node = new ParseNode(ParseNodeType.STAT_DECLARATION_PRIM);
    node.addChild(declareType);
    node.addChild(declareList);
    return node;
  }

  public static createDeclarationArray(declareType: ParseNode, identifier: ParseNode) {
    const node = new ParseNode(ParseNodeType.STAT_DECLARATION_ARR);
    node.addChild(declareType);
    node.addChild(identifier);
    return node;
  }

  public static createDeclarationList(declareItems: ParseNode[]) {
    const node = new ParseNode(ParseNodeType.SEG_DECLARATION_LIST);
    declareItems.map((i) => node.addChild(i));
    return node;
  }

  public static createDeclarationItem(identifier: ParseNode, expression?: ParseNode) {
    const node = new ParseNode(ParseNodeType.SEG_DECLARATION_ITEM, identifier);
    if (!expression) {
      expression = new ParseNode(ParseNodeType.VAL_UNINITIALIZED);
    }
    node.addChild(expression);
    return node;
  }

  public static createPrimitiveType(type: PrimitiveType) {
    return new ParseNode(ParseNodeType.TYPE_PRIMITIVE, type);
  }

  public static createArrayType(elementType: ParseNode, dimension: ParseNode) {
    const node = new ParseNode(ParseNodeType.TYPE_PRIMITIVE);
    node.addChild(elementType);
    node.addChild(dimension);
    return node;
  }

  public static createExprConstantInt(value: number) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_INT, value);
  }
  public static createExprConstantFloat(value: number) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_FLOAT, value);
  }
  public static createExprConstantBool(value: boolean) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_BOOL, value);
  }
  public static createExprConstantChar(value: string) {
    return new ParseNode(ParseNodeType.VAL_CONSTANT_CHAR, value);
  }
  
  public static createExprUnary(op: ParseOperatorType, expr: ParseNode) {
    const node = new ParseNode(ParseNodeType.EXPR_UNI);
    node.addChild(expr);
    return node;
  }
  
  public type: ParseNodeType;
  public value: any;
  public children: ParseNode[] = [];

  constructor(type: ParseNodeType, value?: any) {
    this.type = type;
    this.value = value;
  }

  public print = (indent: number = 2, depth: number = 0) => {
    console.log(`${' '.repeat(indent * depth)}${ParseNodeType[this.type]}`);
    this.children.map((c) => c.print(indent, depth + 1));
  }

  public addChild = (child: ParseNode | null): boolean => {
    if (child) { this.children.push(child); }
    return !!child;
  }
}
