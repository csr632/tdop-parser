export interface Scanner {
  peek(): string | null;
  consume(): string | null;
}

export function createScanner(text: string): Scanner {
  const iterator = text[Symbol.iterator]();
  let next = iterator.next();
  let peeked = false;
  let token: string | null = null;

  return {
    peek(): string | null {
      if (!peeked) token = scanNextToken();
      peeked = true;
      return token;
    },
    consume(): string | null {
      if (peeked) {
        peeked = false;
        return token;
      }
      token = scanNextToken();
      return token;
    },
  };

  function scanNextToken(): string | null {
    // skip WhiteSpace at front
    while (!next.done && isWhiteSpace(next.value)) {
      next = iterator.next();
    }

    if (next.done) return null;

    if (isTokenBoundary(next.value)) {
      const token = next.value;
      next = iterator.next();
      return token;
    }

    let token = "";
    while (!next.done && !isTokenBoundary(next.value)) {
      token += next.value;
      next = iterator.next();
    }
    return token;
  }
}

// token is a sequence of \w
function isTokenBoundary(char: string) {
  if (!char) debugger;
  return !char.match(/^\w$/);
}

function isWhiteSpace(char: string) {
  return char.match(/\s/);
}
