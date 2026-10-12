import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Task 8.69. `tsx` (the test runner) and `tsc` accept `./thing.js` for a file
// named `thing.ts`, but Metro cannot resolve it: the whole web bundle fails to
// load as soon as the app first imports a module carrying one. Nothing in CI
// bundles a module the app does not import yet, so a stray suffix can sit
// unnoticed until the module is wired in. Source the app can bundle uses
// extensionless relative imports; specs and the fixtures only specs import may
// use `.js` (the existing spec convention).
const SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SPEC_FILE_PATTERN = /\.spec\.tsx?$/;
const SPEC_ONLY_FILE_PATTERN = /test-(fixtures|helpers|utils)|\/test-utils\//;
const SUFFIXED_RELATIVE_IMPORT_PATTERN =
  /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"\n]*\.js)['"]/g;

const findSuffixedRelativeImports = (source: string) =>
  [...source.matchAll(SUFFIXED_RELATIVE_IMPORT_PATTERN)].map(
    (match) => match[1],
  );

const listBundledSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listBundledSourceFiles(entryPath);
    }

    const relativePath = relative(SOURCE_ROOT, entryPath).split(sep).join('/');

    return SOURCE_FILE_PATTERN.test(entry.name) &&
      !SPEC_FILE_PATTERN.test(entry.name) &&
      !SPEC_ONLY_FILE_PATTERN.test(relativePath)
      ? [entryPath]
      : [];
  });

describe('relative import suffix guard', () => {
  it('detects a relative import that ends in .js', () => {
    assert.deepEqual(
      findSuffixedRelativeImports(
        "import { a } from './playback-expansion.js';",
      ),
      ['./playback-expansion.js'],
    );
    assert.deepEqual(
      findSuffixedRelativeImports("export * from '../bulk-choices.js';"),
      ['../bulk-choices.js'],
    );
    assert.deepEqual(
      findSuffixedRelativeImports("const m = await import('./lazy.js');"),
      ['./lazy.js'],
    );
  });

  it('ignores extensionless imports and package imports', () => {
    assert.deepEqual(
      findSuffixedRelativeImports(
        "import { a } from './model';\nimport b from 'es-toolkit/compat';\nimport c from 'some.js';",
      ),
      [],
    );
  });

  it('keeps `.js` suffixes out of the source the app can bundle', () => {
    const offenders = listBundledSourceFiles(SOURCE_ROOT).flatMap(
      (filePath) => {
        const suffixed = findSuffixedRelativeImports(
          readFileSync(filePath, 'utf8'),
        );

        return suffixed.length > 0
          ? [`${relative(SOURCE_ROOT, filePath)}: ${suffixed.join(', ')}`]
          : [];
      },
    );

    assert.deepEqual(offenders, []);
  });
});
