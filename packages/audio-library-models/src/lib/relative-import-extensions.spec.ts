import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Metro (the app's bundler) resolves a relative value import only when it
// names the real `.ts` file; `.js` resolves under tsx and tsc but fails the
// app bundle. Type-only imports are erased, so they may use either.
const LIB_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE_PATTERN = /^(?!.*\.spec\.ts$).*\.ts$/;
/** `import { x } from './a.js'` / `export * from './a.js'`, but not `import type`. */
const VALUE_JS_IMPORT_PATTERN =
  /^(?:import(?!\s+type\b)|export)\b[^;]*?from\s+'\.{1,2}\/[^']+\.js'/gm;

describe('model package relative imports', () => {
  it('uses .ts extensions for relative value imports so Metro can resolve them', () => {
    const offenders = readdirSync(LIB_DIRECTORY)
      .filter((fileName) => SOURCE_FILE_PATTERN.test(fileName))
      .flatMap((fileName) => {
        const source = readFileSync(join(LIB_DIRECTORY, fileName), 'utf8');

        return (source.match(VALUE_JS_IMPORT_PATTERN) ?? []).map(
          (match) => `${fileName}: ${match.replace(/\s+/g, ' ')}`,
        );
      });

    assert.deepEqual(offenders, []);
  });
});
