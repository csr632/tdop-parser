import { expect, test } from "vitest";
import { createScanner } from "../scanner";

test("scanner", () => {
  const scanner = createScanner(`import { defineConfig } from 'vite';
  let test = 1234;
`);
  const tokens = [];
  while (scanner.peek()) {
    tokens.push(scanner.consume());
  }
  expect(tokens).toMatchSnapshot();
});
