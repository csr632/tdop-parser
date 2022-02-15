interface PrefixParseLet {
  handle(token: string, parser: any): any;
}
interface InfixParseLet {
  handle(left: any, token: string, parser: any): any;
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
