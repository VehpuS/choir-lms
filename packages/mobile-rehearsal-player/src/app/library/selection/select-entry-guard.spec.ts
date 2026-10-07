import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Guards design Decision 9 ("Select entry control"): selection is entered
// through the shared `SelectEntryButton` icon in a header row, never through a
// surface's own `Select` button or row.
const APP_SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SPEC_FILE_PATTERN = /\.spec\.tsx?$/;
/** Files that define the control and its vocabulary. */
const ALLOWED_FILES = new Set([
  'components/app-icon/index.tsx',
  'components/app-icon/model.ts',
  'library/selection/select-entry-button.tsx',
  'library/selection/selection-copy.ts',
]);
/** The entry icon or copy used outside the shared button. */
const OWN_ENTRY_CONTROL_PATTERN =
  /select-multiple|SELECTION_COPY\.enter|label=["']Select["']|label:\s*['"]Select['"]/g;
const COMMENT_PATTERN = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm;

function listGuardedSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listGuardedSourceFiles(entryPath);
    }

    return SOURCE_FILE_PATTERN.test(entry.name) &&
      !SPEC_FILE_PATTERN.test(entry.name)
      ? [entryPath]
      : [];
  });
}

const findOwnEntryControls = (source: string) =>
  source.replace(COMMENT_PATTERN, '').match(OWN_ENTRY_CONTROL_PATTERN) ?? [];

describe('select entry guard', () => {
  it('detects a surface building its own Select control', () => {
    assert.equal(findOwnEntryControls('<Button label="Select" />').length, 1);
    assert.equal(findOwnEntryControls('icon="select-multiple"').length, 1);
    assert.equal(
      findOwnEntryControls('label={SELECTION_COPY.enter}').length,
      1,
    );
    assert.equal(findOwnEntryControls('// label="Select"').length, 0);
  });

  it('keeps the Select entry control in the shared button only', () => {
    const offenders = listGuardedSourceFiles(APP_SOURCE_ROOT).flatMap(
      (filePath) => {
        const relativePath = relative(APP_SOURCE_ROOT, filePath)
          .split(sep)
          .join('/');

        return ALLOWED_FILES.has(relativePath) ||
          findOwnEntryControls(readFileSync(filePath, 'utf8')).length === 0
          ? []
          : [relativePath];
      },
    );

    assert.deepEqual(
      offenders,
      [],
      'Render `SelectEntryButton` in the screen header row instead of a surface-specific Select control.',
    );
  });
});
