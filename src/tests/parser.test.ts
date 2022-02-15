import { expect, test } from "vitest";
import { createParser } from "../parser";
import { createScanner } from "../scanner";

test("parse -1+2*3+5", () => {
  const parse = createParser(createScanner("-1+2*6/3+5"));
  const res = parse();
  expect(res).toMatchSnapshot();
});

test("parse 1 + 2^3^4*5-6", () => {
  const parse = createParser(createScanner("1 + 2^3^4*5-6"));
  const res = parse();
  expect(res).toMatchSnapshot();
  // console.log(JSON.stringify(res, null, 2))
});
