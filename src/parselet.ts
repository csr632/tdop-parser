import type {
  Value,
  UnaryOperationNode,
  BinaryOperationNode,
  Node,
  ConditionalOperationNode,
} from "./ast";
import type { Parser } from "./parser";

interface PrefixParseLet {
  handle(token: string, parser: Parser): Value | UnaryOperationNode;
}
interface InfixParseLet {
  handle(
    left: Node,
    token: string,
    parser: Parser
  ): BinaryOperationNode | ConditionalOperationNode;
  precedence: number;
}

export const prefixParselets: Record<string, PrefixParseLet> = {
  __value: {
    handle(token, parser) {
      return {
        type: "value",
        value: token,
      };
    },
  },
};

export const infixParselets: Record<string, InfixParseLet> = {};

function helpCreatePrefixOperator(prefix: string, precedence: number) {
  prefixParselets[prefix] = {
    handle(token, { parseExp }) {
      const body = parseExp(precedence);
      return {
        type: "unary",
        operator: prefix,
        right: body,
      };
    },
  };
}

function helpCreateInfixOperator(
  infix: string,
  precedence: number,
  associateRight2Left: boolean = false
) {
  infixParselets[infix] = {
    precedence,
    handle(left, token, { parseExp }) {
      const right = parseExp(associateRight2Left ? precedence - 1 : precedence);
      return {
        type: "binary",
        operator: infix,
        left,
        right,
      };
    },
  };
}

// use operator precedence of JavaScript
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_Operators#operator_precedence

helpCreatePrefixOperator("+", 50);
helpCreatePrefixOperator("-", 50);

helpCreateInfixOperator("+", 10);
helpCreateInfixOperator("-", 10);
helpCreateInfixOperator("*", 20);
helpCreateInfixOperator("/", 20);
helpCreateInfixOperator("^", 30, true);

// TODO: ensure conditional chains support
// Conditional operater is a special "infix operator"
infixParselets["?"] = {
  // the binding power between condition node and "?"
  // is very small, but bigger than assignment
  precedence: 5,
  handle(left, token, { parseExp, scanner }): ConditionalOperationNode {
    // the binding power to true/false branch is smallest
    // (parse expression as long as possible)
    const trueBranch = parseExp(0);

    const nextToken = scanner.peek();
    if (nextToken !== ":")
      throw new Error(`expect token : but got ${nextToken}`);
    scanner.consume();

    const falseBranch = parseExp(0);

    return {
      type: "conditional",
      condition: left,
      trueBranch,
      falseBranch,
    };
  },
};
