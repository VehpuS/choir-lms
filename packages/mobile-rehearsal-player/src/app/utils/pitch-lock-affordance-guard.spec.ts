import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Guards the playback-shaping decision that speed and pitch are independent
// and never offered as a "pitch lock" toggle (design: no pitch-lock affordance).
const APP_SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SPEC_FILE_PATTERN = /\.spec\.tsx?$/;

/** User-facing copy such as `Pitch lock`, `Lock pitch`, `Keep pitch`, `Preserve pitch`. */
const PITCH_LOCK_COPY_PATTERN =
  /\b(?:pitch[\s_-]?lock(?:ed)?|lock(?:ed)?[\s_-]?pitch|keep[\s_-]pitch|preserve[\s_-]pitch)\b/gi;
/** A Phosphor lock glyph (`Lock`, `LockSimple`, `LockKey`, ...) registered as an app icon. */
const LOCK_ICON_PATTERN = /\bLock(?:Simple|Key|Laminated)?(?:Open)?Icon\b/g;

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

/** Block comments and whole-line `//` comments; engine notes may mention keeping pitch. */
const COMMENT_PATTERN = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm;

function findPitchLockAffordances(source: string): string[] {
  const code = source.replace(COMMENT_PATTERN, '');

  return [
    ...(code.match(PITCH_LOCK_COPY_PATTERN) ?? []),
    ...(code.match(LOCK_ICON_PATTERN) ?? []),
  ];
}

describe('pitch-lock affordance guard', () => {
  it('detects pitch-lock copy and lock icons', () => {
    assert.equal(findPitchLockAffordances("label: 'Pitch lock'").length, 1);
    assert.equal(findPitchLockAffordances('<Text>Keep pitch</Text>').length, 1);
    assert.equal(
      findPitchLockAffordances("import { LockSimpleIcon } from 'phosphor'")
        .length,
      1,
    );
  });

  it('ignores the engine-level preservesPitch property and unrelated words', () => {
    assert.equal(
      findPitchLockAffordances('element.preservesPitch = true;').length,
      0,
    );
    assert.equal(
      findPitchLockAffordances('// keep pitch cleanly\n/* Pitch lock */')
        .length,
      0,
    );
    assert.equal(findPitchLockAffordances('ClockCountdownIcon').length, 0);
    assert.equal(findPitchLockAffordances('viewSwitcherLockModel').length, 0);
  });

  it('keeps pitch-lock copy and lock icons out of src/app', () => {
    const offenders = listGuardedSourceFiles(APP_SOURCE_ROOT).flatMap(
      (filePath) => {
        const matches = findPitchLockAffordances(
          readFileSync(filePath, 'utf8'),
        );
        const relativePath = relative(APP_SOURCE_ROOT, filePath)
          .split(sep)
          .join('/');

        return matches.map((match) => `${relativePath}: ${match}`);
      },
    );

    assert.deepEqual(
      offenders,
      [],
      'Speed and pitch are independent controls; do not add a pitch-lock toggle, icon, or copy.',
    );
  });
});
