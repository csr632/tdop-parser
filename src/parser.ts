import { prefixParselets, infixParselets } from "./parselet";
import type { Scanner } from "./scanner";

export function createParser(scanner: Scanner) {
  const parser = {
    parseExp,
  };

  function parseExp(ctxPrecedence: number): any {
    let prefixToken = scanner.consume();
    if (!prefixToken) throw new Error();

    // because our scanner is so naive,
    // we treat all non-operator tokens as value (.e.g number)
    const prefixParselet =
      prefixParselets[prefixToken] ?? prefixParselets.__value;
    let left = prefixParselet.handle(prefixToken, parser);

    while (true) {
      const infixToken = scanner.peek();
      if (!infixToken) break;
      const infixParselet = infixParselets[infixToken];
      if (!infixParselet) throw new Error(infixToken);
      if (infixParselet.precedence <= ctxPrecedence) break;
      scanner.consume();
      left = infixParselet.handle(left, infixToken, parser);
    }
    return left;
  }

  return function parse() {
    return parseExp(0);
  };
}
