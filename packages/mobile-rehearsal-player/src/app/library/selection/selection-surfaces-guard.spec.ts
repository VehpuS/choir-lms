import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Guards the consistency sweep of task 9.10: every surface that offers
// selection uses the shared entry icon, the shared selection bar (count and
// `Select all` toggle) and the pinned bulk-action bar together, so none can
// drift to its own variant. Add a surface here when it gains selection.
const APP_SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SPEC_FILE_PATTERN = /\.spec\.tsx?$/;
const ENTRY_USAGE_PATTERN = /<SelectEntryButton\b/;
const SELECTION_BAR_PATTERN = /<SelectionBar\b/;
const PINNED_BAR_PATTERN = /usePinnedBulkActionBar\(/;

const SELECTION_SURFACES = [
  // Add: the Drive browse and search basket.
  'library/drive/components/drive-discovery-panel.tsx',
  // Library: Files, the entity lists (Tracks, Loops, Playlists, tag detail),
  // and playlist detail.
  'library/selection/use-library-entity-selection.tsx',
  'library/components/saved-rehearsal-library-section/use-library-files-selection.tsx',
  'library/selection/use-playlist-detail-selection.tsx',
] as const;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return SOURCE_FILE_PATTERN.test(entry.name) &&
      !SPEC_FILE_PATTERN.test(entry.name)
      ? [entryPath]
      : [];
  });
}

const toRelativePath = (filePath: string) =>
  relative(APP_SOURCE_ROOT, filePath).split(sep).join('/');

describe('selection surfaces', () => {
  const files = listSourceFiles(APP_SOURCE_ROOT).map((filePath) => ({
    path: toRelativePath(filePath),
    source: readFileSync(filePath, 'utf8'),
  }));
  const entryFiles = files.filter(({ path, source }) => {
    // The button's own definition is not a surface.
    return (
      path !== 'library/selection/select-entry-button.tsx' &&
      ENTRY_USAGE_PATTERN.test(source)
    );
  });

  it('lists every file that renders the shared Select entry icon', () => {
    assert.deepEqual(
      entryFiles.map(({ path }) => path).sort(),
      [...SELECTION_SURFACES].sort(),
    );
  });

  it('pairs the entry icon with the shared selection bar and the pinned action bar', () => {
    const incomplete = entryFiles
      .filter(
        ({ source }) =>
          !SELECTION_BAR_PATTERN.test(source) ||
          !PINNED_BAR_PATTERN.test(source),
      )
      .map(({ path }) => path);

    assert.deepEqual(incomplete, []);
  });
});
