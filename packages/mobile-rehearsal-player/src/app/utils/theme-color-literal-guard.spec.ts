import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { themeColorLiteralBaseline } from './theme-color-literal-baseline';

// Guards the Nocturne rule that every color comes from `theme.ts`.
const APP_SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN_MODULE_PATH = 'utils/theme.ts';
const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SPEC_FILE_PATTERN = /\.spec\.tsx?$/;

/** `'#abc'`, `"#aabbcc"`, `` `#aabbccdd` `` — a hex color opening a string. */
const HEX_COLOR_LITERAL_PATTERN =
  /['"`]#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
/** `rgb(`, `rgba(`, `hsl(`, `hsla(` color functions. */
const COLOR_FUNCTION_PATTERN = /\b(?:rgba?|hsla?)\(/gi;
/** A named color assigned to a color prop or style key, except `transparent`. */
const NAMED_COLOR_PROP_PATTERN =
  /[cC]olor\w*\s*[:=]\s*\{?\s*['"](?!transparent['"])[a-z]+['"]/g;
const COLOR_LITERAL_PATTERNS = [
  HEX_COLOR_LITERAL_PATTERN,
  COLOR_FUNCTION_PATTERN,
  NAMED_COLOR_PROP_PATTERN,
];

function listGuardedSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listGuardedSourceFiles(entryPath);
    }

    const isGuardedSource =
      SOURCE_FILE_PATTERN.test(entry.name) &&
      !SPEC_FILE_PATTERN.test(entry.name);

    return isGuardedSource ? [entryPath] : [];
  });
}

function countColorLiterals(source: string): number {
  return COLOR_LITERAL_PATTERNS.reduce((total, pattern) => {
    return total + (source.match(pattern)?.length ?? 0);
  }, 0);
}

function collectColorLiteralCounts(): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const filePath of listGuardedSourceFiles(APP_SOURCE_ROOT)) {
    const relativePath = relative(APP_SOURCE_ROOT, filePath)
      .split(sep)
      .join('/');

    if (relativePath === TOKEN_MODULE_PATH) {
      continue;
    }

    const literalCount = countColorLiterals(readFileSync(filePath, 'utf8'));

    if (literalCount > 0) {
      counts[relativePath] = literalCount;
    }
  }

  return counts;
}

function formatCounts(counts: Record<string, number>): string {
  const sortedEntries = Object.keys(counts)
    .sort()
    .map((key) => {
      return `  '${key}': ${counts[key]},`;
    });

  return ['{', ...sortedEntries, '}'].join('\n');
}

describe('theme color literal guard', () => {
  it('detects hex, color-function, and named color literals', () => {
    assert.equal(countColorLiterals("color: '#1f1c17'"), 1);
    assert.equal(
      countColorLiterals("backgroundColor: 'rgba(0, 0, 0, 0.5)'"),
      1,
    );
    assert.equal(countColorLiterals('<Icon color="white" />'), 1);
    assert.equal(countColorLiterals("backgroundColor: 'transparent'"), 0);
    assert.equal(countColorLiterals('// see issue #123'), 0);
  });

  it('keeps raw color literals out of src/app except known pre-Nocturne files', () => {
    const currentCounts = collectColorLiteralCounts();

    assert.deepEqual(
      currentCounts,
      themeColorLiteralBaseline,
      [
        'Raw color literals in src/app must match theme-color-literal-baseline.ts.',
        'Use appTheme tokens instead of new literals; after migrating a file, shrink its baseline entry.',
        `Current counts:\n${formatCounts(currentCounts)}`,
      ].join('\n'),
    );
  });
});
