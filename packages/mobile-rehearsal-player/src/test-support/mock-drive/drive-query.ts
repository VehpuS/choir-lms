// A small evaluator for the Drive `files.list` query language, enough for the
// queries this app sends: `trashed`, `name`, `mimeType`, `'<id>' in parents`,
// `'me' in owners`, `sharedWithMe` and `appProperties has {…}`, joined with
// `and`, `or` and parentheses. It lets the browser suite's mock Drive answer
// the same questions Drive does. A query it does not understand throws, so a
// new kind of query shows up as a clear failure instead of a wrong answer.
export type DriveQueryFile = {
  appProperties?: Record<string, string>;
  /** Emails of the owners; `'me' in owners` is true when `me` is one of them. */
  ownerEmails: string[];
  mimeType: string;
  name: string;
  parents: string[];
  sharedWithMe?: boolean;
  trashed?: boolean;
};

type Token =
  | { kind: 'string'; value: string }
  | { kind: 'word'; value: string }
  | { kind: 'symbol'; value: string };

const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_]*/y;
const WHITESPACE_PATTERN = /\s+/y;
const SYMBOLS = new Set(['(', ')', '{', '}', '=']);
const QUOTE = "'";
const BACKSLASH = '\\';

const tokenize = (query: string): Token[] => {
  const tokens: Token[] = [];
  let at = 0;

  while (at < query.length) {
    WHITESPACE_PATTERN.lastIndex = at;

    if (WHITESPACE_PATTERN.test(query)) {
      at = WHITESPACE_PATTERN.lastIndex;
      continue;
    }

    const character = query[at];

    if (character === QUOTE) {
      let value = '';

      at += 1;

      while (at < query.length && query[at] !== QUOTE) {
        if (query[at] === BACKSLASH) {
          at += 1;
        }

        value += query[at];
        at += 1;
      }

      tokens.push({ kind: 'string', value });
      at += 1;
      continue;
    }

    if (SYMBOLS.has(character)) {
      tokens.push({ kind: 'symbol', value: character });
      at += 1;
      continue;
    }

    WORD_PATTERN.lastIndex = at;

    const word = WORD_PATTERN.exec(query);

    if (!word) {
      throw new Error(
        `Mock Drive cannot read "${query.slice(at, at + 20)}" in: ${query}`,
      );
    }

    tokens.push({ kind: 'word', value: word[0] });
    at = WORD_PATTERN.lastIndex;
  }

  return tokens;
};

type Context = { file: DriveQueryFile; me: string };

const compare = (actual: string, operator: string, expected: string) =>
  operator === 'contains'
    ? actual.toLowerCase().includes(expected.toLowerCase())
    : actual === expected;

/** Evaluates `query` for one file. `me` is the signed-in user's email. */
export const matchesDriveQuery = (
  query: string,
  file: DriveQueryFile,
  me: string,
): boolean => {
  const tokens = tokenize(query);
  const context: Context = { file, me };
  let position = 0;

  const peek = () => tokens[position];
  const fail = (): never => {
    throw new Error(`Mock Drive does not understand this query: ${query}`);
  };
  const take = (): Token => {
    const token = tokens[position];

    if (!token) {
      return fail();
    }

    position += 1;

    return token;
  };
  const expectWord = (word?: string): string => {
    const token = take();

    if (token.kind !== 'word' || (word !== undefined && token.value !== word)) {
      return fail();
    }

    return token.value;
  };
  const expectSymbol = (symbol: string) => {
    const token = take();

    if (token.kind !== 'symbol' || token.value !== symbol) {
      fail();
    }
  };
  const expectString = (): string => {
    const token = take();

    return token.kind === 'string' ? token.value : fail();
  };
  const isWord = (word: string) => {
    const token = peek();

    return token?.kind === 'word' && token.value === word;
  };

  const parseAppProperties = (): boolean => {
    expectSymbol('{');
    expectWord('key');
    expectSymbol('=');

    const key = expectString();

    expectWord('and');
    expectWord('value');
    expectSymbol('=');

    const value = expectString();

    expectSymbol('}');

    return context.file.appProperties?.[key] === value;
  };

  const parseTerm = (): boolean => {
    const token = peek();

    if (token?.kind === 'symbol' && token.value === '(') {
      take();

      const inner = parseOr();

      expectSymbol(')');

      return inner;
    }

    if (token?.kind === 'string') {
      // `'<id>' in parents` / `'me' in owners`
      const value = expectString();

      expectWord('in');

      const collection = expectWord();

      if (collection === 'parents') {
        return context.file.parents.includes(value);
      }

      if (collection === 'owners') {
        return value === 'me'
          ? context.file.ownerEmails.includes(context.me)
          : context.file.ownerEmails.includes(value);
      }

      return fail();
    }

    const field = expectWord();

    if (field === 'sharedWithMe') {
      return context.file.sharedWithMe === true;
    }

    if (field === 'trashed') {
      expectSymbol('=');

      return (context.file.trashed === true) === (expectWord() === 'true');
    }

    if (field === 'appProperties') {
      expectWord('has');

      return parseAppProperties();
    }

    if (field === 'name' || field === 'mimeType') {
      const operator = take();
      const operatorText =
        operator.kind === 'symbol' || operator.kind === 'word'
          ? operator.value
          : fail();

      if (operatorText !== '=' && operatorText !== 'contains') {
        return fail();
      }

      return compare(context.file[field], operatorText, expectString());
    }

    return fail();
  };

  const parseAnd = (): boolean => {
    let result = parseTerm();

    while (isWord('and')) {
      take();
      // Evaluate both sides so the whole query is always parsed.
      result = parseTerm() && result;
    }

    return result;
  };

  function parseOr(): boolean {
    let result = parseAnd();

    while (isWord('or')) {
      take();
      result = parseAnd() || result;
    }

    return result;
  }

  const matched = parseOr();

  if (position !== tokens.length) {
    fail();
  }

  return matched;
};
