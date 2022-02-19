import { describe, expect, test } from "vitest";
import { createParser } from "../parser";
import { createScanner } from "../scanner";

describe("basic", () => {
  test("-1+2*6/3+5", () => {
    const parser = createParser(createScanner("-1+2*6/3+5"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("1 + 2^3^4*5-6", () => {
    const parser = createParser(createScanner("1 + 2^3^4*5-6"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
    // console.log(JSON.stringify(res, null, 2))
  });
});

describe("conditional operation", () => {
  test("true ? 1 : 2", () => {
    const parser = createParser(createScanner("true ? 1 : 2"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("1+ 2  *3 ? 1+1 : 2  -1", () => {
    const parser = createParser(createScanner("1+ 2  *3 ? 1+1 : 2  -1"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("conditional chains", () => {
    const parser = createParser(
      createScanner(`
  condition1 ? value1
  : condition2 ? value2
  : condition3 ? value3
  : value4`)
    );
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });
  test("conditional chains", () => {
    const parser = createParser(
      createScanner(`
  condition1
    ? condition2 ? true2 : false2
    : condition3
      ? condition4 ? true4 : false4
      : condition5 ? true5 : false5
  `)
    );
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("true ? 1 ; 2", () => {
    expect(() => {
      const parser = createParser(createScanner("true ? 1 ; 2"));
      parser.parseProgram();
    }).toThrowError("expect token : but got ;");
  });
});

describe("error handling", () => {
  test("1 + ", () => {
    expect(() => {
      const parser = createParser(createScanner("1 + "));
      parser.parseProgram();
    }).toThrowError("expect token but found none");
  });

  test("1 2", () => {
    const parser = createParser(createScanner("1 2"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });
});

describe("parenthesis", () => {
  test("2*(3-1)", () => {
    const parser = createParser(createScanner("2*(3-1)"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("((1))+1", () => {
    const parser = createParser(createScanner("((1))+1"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("2*(9*(((2))+1))-1", () => {
    const parser = createParser(createScanner("2*(9*(((2))+1))-1"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("2*(3 1)", () => {
    expect(() => {
      const parser = createParser(createScanner("2*(3 1)"));
      parser.parseProgram();
    }).toThrowError("expect token ) but got 1");
  });
});

describe("function call", () => {
  test("fn1()", () => {
    const parser = createParser(createScanner("fn1()"));
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("fn1(arg1) + fn2(arg1, arg2) + fn3(arg1,)", () => {
    const parser = createParser(
      createScanner("fn1(arg1) + fn2(arg1, arg2) + fn3(arg1,)")
    );
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("nested", () => {
    const parser = createParser(
      createScanner("fn1(fn2(arg2), arg1)(fn3(fn4(arg4), arg3))")
    );
    const res = parser.parseProgram();
    expect(res).toMatchSnapshot();
  });

  test("error", () => {
    expect(() => {
      const parser = createParser(createScanner("fn1(arg1 arg2)"));
      const res = parser.parseProgram();
    }).toThrowErrorMatchingInlineSnapshot('"expect token ) but got arg2"');
  });

  test("error", () => {
    expect(() => {
      const parser = createParser(createScanner("fn1(arg1"));
      const res = parser.parseProgram();
    }).toThrowErrorMatchingInlineSnapshot('"expect token ) but got null"');
  });
});
