import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { appTheme } from './theme';

// iOS Safari zooms the page in when a field with text under 16 px gets focus
// and leaves it zoomed, so no field may go below this size.
const MIN_INPUT_FONT_SIZE = 16;
const SRC_ROOT = join(__dirname, '..', '..');
const SOURCE_FILE_PATTERN = /\.tsx?$/;
const SPEC_FILE_PATTERN = /\.spec\.tsx?$/;
// A style block named like a text field (`field`, `nameInput`, `searchInput`)
// that sets a literal font size.
const FIELD_STYLE_PATTERN =
  /^\s*(field|textField|\w*[Ii]nput): \{[^}]*?fontSize: (\d+(?:\.\d+)?)/gm;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) {
      return name === 'node_modules' ? [] : sourceFiles(path);
    }

    return SOURCE_FILE_PATTERN.test(name) && !SPEC_FILE_PATTERN.test(name)
      ? [path]
      : [];
  });

describe('input font size', () => {
  it('is at least 16 in the theme', () => {
    assert.ok(appTheme.type.input.fontSize >= MIN_INPUT_FONT_SIZE);
  });

  it('is not set smaller than 16 on any field style', () => {
    const tooSmall = sourceFiles(SRC_ROOT).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(FIELD_STYLE_PATTERN)]
        .filter((match) => Number(match[2]) < MIN_INPUT_FONT_SIZE)
        .map((match) => `${path}: ${match[1]} uses ${match[2]}`),
    );

    assert.deepEqual(tooSmall, []);
  });
});
