import { describe, expect, test } from "vitest";
import { createScanner } from "../scanner";

test("scan js like syntax", () => {
  const scanner = createScanner(`import { defineConfig } from 'vite';
  let test = 1234;
`);
  const tokens: string[] = [];
  while (scanner.peek()) {
    tokens.push(scanner.consume()!);
  }
  expect(tokens).toMatchSnapshot();
});

describe("scan math like syntax", () => {
  let tokens: string[] = [];
  test("consume", () => {
    const scanner = createScanner(`-1+2 * 3-(4/2)`);
    while (scanner.peek()) {
      tokens.push(scanner.consume()!);
    }
    expect(tokens).toMatchSnapshot();
  });

  test("peek", () => {
    const scanner = createScanner(`-1+2 * 3-(4/2)`);

    const tokens2 = peekAll();
    expect(tokens2).toEqual(tokens);

    // after consume, the peeked result should move over
    scanner.consume();
    scanner.consume();
    const tokens3 = peekAll();
    expect(tokens3).toEqual(tokens2.slice(2));

    function peekAll() {
      const tokens: string[] = [];
      let i = 0;
      let token = scanner.peek(i);
      while (token) {
        tokens.push(token);
        i++;
        token = scanner.peek(i);
      }
      return tokens;
    }
  });
});
