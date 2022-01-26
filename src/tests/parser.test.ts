import { expect, test } from "vitest";
import { createParser } from "../parser";
import { createScanner } from "../scanner";

test("parse -1 + 2 * 3", () => {
  const parse = createParser(createScanner("-1 + 2 * 3"));
  const res = parse();
});

test("parse -1+2*3+5", () => {
  const parse = createParser(createScanner("-1+2*6/3+5"));
  const res = parse();
  expect(res).toMatchSnapshot();
});
