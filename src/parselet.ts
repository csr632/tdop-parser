import type { Value, UnaryOperationNode, BinaryOperationNode, Node } from "./ast";

interface PrefixParseLet {
  handle(token: string, parser: any): Value | UnaryOperationNode;
}
interface InfixParseLet {
  handle(left: Node, token: string, parser: any): BinaryOperationNode;
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

helpCreatePrefixOperator("+", 50);
helpCreatePrefixOperator("-", 50);

helpCreateInfixOperator("+", 10);
helpCreateInfixOperator("-", 10);
helpCreateInfixOperator("*", 20);
helpCreateInfixOperator("/", 20);
helpCreateInfixOperator("^", 30, true);
