import type { Scanner } from "./scanner";

export function createParser(scanner: Scanner) {
  function parse(precedence: number): any {
    let nudToken = scanner.consume();
    if (!nudToken) throw new Error();

    const nud = nuds[nudToken] ?? nuds.__default;
    let left = nud.handle(nudToken);

    let ledToken = scanner.peek();
    while (ledToken) {
      const led = leds[ledToken];
      if (!led) throw new Error(ledToken);
      if (led.precedence <= precedence) break;
      scanner.consume();
      left = led.handle(ledToken, left);
      ledToken = scanner.peek();
    }

    return left;
  }

  const nuds = {
    __default: {
      handle(token) {
        return {
          type: "value",
          value: token,
        };
      },
    },
    "+": {
      precedence: 10,
      handle() {
        const body = parse(10);
        if (!body) throw new Error("invalid");
        return {
          type: "prefix+",
          body,
        };
      },
    },
    "-": {
      precedence: 10,
      handle() {
        const body = parse(10);
        if (!body) throw new Error("invalid");
        return {
          type: "prefix-",
          body,
        };
      },
    },
  };

  const leds = {
    "+": {
      precedence: 1,
      handle(token, left) {
        const right = parse(1);
        if (!right) throw new Error("invalid");
        return {
          type: "infix+",
          left,
          right,
        };
      },
    },
    "*": {
      precedence: 10,
      handle(token, left) {
        const right = parse(10);
        if (!right) throw new Error("invalid");
        return {
          type: "infix*",
          left,
          right,
        };
      },
    },
  };

  return () => {
    return parse(0);
  };
}
