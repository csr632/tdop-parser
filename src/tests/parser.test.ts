import { expect, test } from "vitest";
import { createParser } from "../parser";
import { createScanner } from "../scanner";

test("parse -1+2*6/3+5", () => {
  const parser = createParser(createScanner("-1+2*6/3+5"));
  const res = parser.parseProgram();
  expect(res).toMatchSnapshot();
});

test("parse 1 + 2^3^4*5-6", () => {
  const parser = createParser(createScanner("1 + 2^3^4*5-6"));
  const res = parser.parseProgram();
  expect(res).toMatchSnapshot();
  // console.log(JSON.stringify(res, null, 2))
});

test("parse true ? 1 : 2", () => {
  const parser = createParser(createScanner("true ? 1 : 2"));
  const res = parser.parseProgram();
  expect(res).toMatchSnapshot();
});

test("parse 1+ 2  *3 ? 1+1 : 2  -1", () => {
  const parser = createParser(createScanner("1+ 2  *3 ? 1+1 : 2  -1"));
  const res = parser.parseProgram();
  expect(res).toMatchSnapshot();
});

test("parse true ? 1 ; 2", () => {
  expect(() => {
    const parser = createParser(createScanner("true ? 1 ; 2"));
    parser.parseProgram();
  }).toThrowError("expect token : but got ;");
});

test("parse 1 + ", () => {
  expect(() => {
    const parser = createParser(createScanner("1 + "));
    parser.parseProgram();
  }).toThrowError("expect token but found none");
});

test("parse 1 2", () => {
  const parser = createParser(createScanner("1 2"));
  const res = parser.parseProgram();
  expect(res).toMatchSnapshot();
});
