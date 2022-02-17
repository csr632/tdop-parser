export type Node = Value | UnaryOperationNode | BinaryOperationNode;

export interface BinaryOperationNode {
  type: "binary";
  operator: string;
  left: Node;
  right: Node;
}

export interface UnaryOperationNode {
  type: "unary";
  operator: string;
  right: Node;
}

// this naive parser
// don't distinguish between string and number and boolean
export interface Value {
  type: "value";
  value: string;
}
