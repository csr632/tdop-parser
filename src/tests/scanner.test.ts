import { expect, test } from "vitest";
import { createScanner } from "../scanner";

test("scan js like syntax", () => {
  const scanner = createScanner(`import { defineConfig } from 'vite';
  let test = 1234;
`);
  const tokens = [];
  while (scanner.peek()) {
    tokens.push(scanner.consume());
  }
  expect(tokens).toMatchSnapshot();
});

test("scan math like syntax", () => {
  const scanner = createScanner(`1+2 * 3-(4/2)`);
  const tokens = [];
  while (scanner.peek()) {
    tokens.push(scanner.consume());
  }
  expect(tokens).toMatchSnapshot();
});
