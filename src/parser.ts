import type { Scanner } from "./scanner";

export function createParser(scanner: Scanner) {
  const parser = {
    parseExp,
  };

  function parseExp(ctxPrecedence: number): any {
    let prefixToken = scanner.consume();
    if (!prefixToken) throw new Error();

    const prefixParselet =
      prefixParselets[prefixToken] ?? prefixParselets.__default;
    let left = prefixParselet.handle(prefixToken, parser);

    let infixToken = scanner.peek();
    while (infixToken) {
      const infixParselet = infixParselets[infixToken];
      if (!infixParselet) throw new Error(infixToken);
      if (infixParselet.precedence <= ctxPrecedence) break;
      scanner.consume();
      left = infixParselet.handle(left, infixToken, parser);
      infixToken = scanner.peek();
    }
    return left;
  }

  return function parse() {
    return parseExp(0);
  };
}

interface PrefixParseLet {
  handle(token: string, parser: any): any;
}
const prefixParselets: Record<string, PrefixParseLet> = {
  __default: {
    handle(token, parser) {
      return {
        type: "value",
        value: token,
      };
    },
  },
};
interface InfixParseLet {
  handle(left: any, token: string, parser: any): any;
  precedence: number;
}
const infixParselets: Record<string, InfixParseLet> = {};

function helpCreatePrefixOperator(prefix: string, precedence: number) {
  prefixParselets[prefix] = {
    handle(token, { parseExp }) {
      const body = parseExp(precedence);
      if (!body) throw new Error(`invalid prefix usage "${prefix}"`);
      return {
        type: `prefix${prefix}`,
        body,
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
      if (!right) throw new Error(`invalid infix usage "${infix}"`);
      return {
        type: `infix${infix}`,
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
