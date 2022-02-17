export type Node =
  | Value
  | UnaryOperationNode
  | BinaryOperationNode
  | ConditionalOperationNode;

// this naive parser
// don't distinguish between string and number and boolean
export interface Value {
  type: "value";
  value: string;
}

export interface UnaryOperationNode {
  type: "unary";
  operator: string;
  right: Node;
}

export interface BinaryOperationNode {
  type: "binary";
  operator: string;
  left: Node;
  right: Node;
}

export interface ConditionalOperationNode {
  type: "conditional";
  condition: Node;
  trueBranch: Node;
  falseBranch: Node;
}
