import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { findSentenceCaseViolations } from './copy-casing';

// Guards design Decision 15 (task 10.3): interface copy is sentence case. It
// reads every capitalized multi-word string literal and JSX text in the app's
// source and fails on a capitalized word after the first that is not a proper
// name. All-caps kickers are sentence-case source with `textTransform:
// 'uppercase'`, so they pass. To reference a button or menu label inside copy,
// quote it (`Choose "Make loop"`); a quoted label keeps its own capitals.
const APP_SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE_PATTERN = /\.tsx?$/;
/** Specs and fixtures hold sample data, and the theme holds style values. */
const EXEMPT_FILE_PATTERN =
  /(\.spec\.tsx?$|fixtures?|test-helpers|test-utils|[\\/]theme\.ts$)/;
const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_PATTERN = /^\s*\/\/.*$/gm;
const IMPORT_PATTERN = /^\s*(?:import|export)\s[\s\S]*?from\s+['"].*?['"];?/gm;
const STRING_LITERAL_PATTERN = /(["'`])((?:(?!\1)[^\\\n]|\\.)*?)\1/g;
const JSX_TEXT_PATTERN = />\s*([A-Z][^<>{}]*?)\s*</g;
const COPY_START_PATTERN = /^[A-Z][A-Za-z]+(?:,| |\.)/;
const CODE_PATTERN = /[_/\\]|=>|:\/\//;

function listGuardedSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listGuardedSourceFiles(entryPath);
    }

    return SOURCE_FILE_PATTERN.test(entry.name) &&
      !EXEMPT_FILE_PATTERN.test(entryPath)
      ? [entryPath]
      : [];
  });
}

const looksLikeCopy = (text: string) =>
  text.includes(' ') &&
  COPY_START_PATTERN.test(text) &&
  !CODE_PATTERN.test(text);

const stripNonCopy = (source: string) =>
  source
    .replace(BLOCK_COMMENT_PATTERN, '')
    .replace(LINE_COMMENT_PATTERN, '')
    .replace(IMPORT_PATTERN, '');

/** Every copy-like string in a source file, with the words that break the rule. */
const findViolations = (source: string) => {
  const text = stripNonCopy(source);
  const literals = [...text.matchAll(STRING_LITERAL_PATTERN)].map(
    (match) => match[2],
  );
  const jsxTexts = [...text.matchAll(JSX_TEXT_PATTERN)].map((match) =>
    match[1].replace(/\s+/g, ' ').trim(),
  );

  return [...literals, ...jsxTexts].filter(looksLikeCopy).flatMap((copy) => {
    const words = findSentenceCaseViolations(copy);

    return words.length > 0 ? [`${copy.replace(/\s+/g, ' ')} -> ${words}`] : [];
  });
};

describe('interface copy casing', () => {
  it('detects a Title Case string in source', () => {
    assert.deepEqual(findViolations("const label = 'Edit Selection';"), [
      'Edit Selection -> Selection',
    ]);
    assert.deepEqual(findViolations('<Text>Save to Library</Text>'), [
      'Save to Library -> Library',
    ]);
    assert.deepEqual(findViolations("const label = 'Edit selection';"), []);
  });

  it('keeps every user-facing string in sentence case', () => {
    const offenders = listGuardedSourceFiles(APP_SOURCE_ROOT).flatMap(
      (filePath) =>
        findViolations(readFileSync(filePath, 'utf8')).map(
          (violation) =>
            `${relative(APP_SOURCE_ROOT, filePath).split(sep).join('/')}: ${violation}`,
        ),
    );

    assert.deepEqual(
      offenders,
      [],
      'Write interface text in sentence case; quote a label the copy refers to, and add a proper name to PROPER_NAMES in copy-casing.ts only if it truly is one.',
    );
  });
});
