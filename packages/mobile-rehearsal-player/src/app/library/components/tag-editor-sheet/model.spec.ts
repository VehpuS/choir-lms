/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';

import {
  addLibraryEntityTag,
  getActiveTagEditorInputSegment,
  parseLibraryTagInput,
  removeLibraryEntityTag,
  removeTagEditorInputActiveSegment,
  resolveTagEditorSuggestions,
  TAG_EDITOR_SUGGESTION_CAP,
} from './model.js';

describe('tag editor model', () => {
  it('parses comma-delimited input into normalized tags', () => {
    assert.deepEqual(parseLibraryTagInput(' alto, tenor , , warm  up '), [
      'alto',
      'tenor',
      'warm up',
    ]);
  });

  it('adds parsed tags and keeps existing unique tags stable', () => {
    assert.deepEqual(
      addLibraryEntityTag(['Alto', 'Tenor'], 'soprano, alto, rehearsal'),
      ['Alto', 'Tenor', 'soprano', 'rehearsal'],
    );
  });

  it('removes only the selected tag token', () => {
    assert.deepEqual(
      removeLibraryEntityTag(['Alto', 'Tenor', 'Warm up'], 'Tenor'),
      ['Alto', 'Warm up'],
    );
  });
});

describe('getActiveTagEditorInputSegment', () => {
  it('returns the whole trimmed input when there is no comma yet', () => {
    assert.equal(getActiveTagEditorInputSegment('  Sop '), 'Sop');
  });

  it('returns the empty string right after a trailing comma', () => {
    assert.equal(getActiveTagEditorInputSegment('Alto, '), '');
  });

  it('returns only the text after the last comma when multiple tags are typed', () => {
    assert.equal(getActiveTagEditorInputSegment('Alto, Tenor, Sop'), 'Sop');
  });

  it('trims surrounding whitespace from the active segment', () => {
    assert.equal(
      getActiveTagEditorInputSegment('Alto,   Warm up  '),
      'Warm up',
    );
  });
});

describe('resolveTagEditorSuggestions', () => {
  const buildTagUsage = (
    tag: string,
    count: number,
  ): RehearsalLibraryTagUsage => ({
    tag,
    count,
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const AVAILABLE_TAG_USAGE: RehearsalLibraryTagUsage[] = [
    buildTagUsage('Soprano', 5),
    buildTagUsage('Alto', 4),
    buildTagUsage('Tenor', 3),
    buildTagUsage('Bass', 2),
    buildTagUsage('Warmup', 1),
  ];

  it('ranks by usage, most-used-first, when the active segment is empty', () => {
    assert.deepEqual(
      resolveTagEditorSuggestions(AVAILABLE_TAG_USAGE, [], ''),
      ['Soprano', 'Alto', 'Tenor', 'Bass', 'Warmup'],
    );
  });

  it('narrows to tags matching the active segment via case-insensitive substring', () => {
    assert.deepEqual(
      resolveTagEditorSuggestions(AVAILABLE_TAG_USAGE, [], 'so'),
      ['Soprano'],
    );
  });

  it('excludes tags already present in currentTags, case-insensitively', () => {
    assert.deepEqual(
      resolveTagEditorSuggestions(AVAILABLE_TAG_USAGE, ['alto'], ''),
      ['Soprano', 'Tenor', 'Bass', 'Warmup'],
    );
  });

  it('caps the result at 12 suggestions', () => {
    const manyTagUsage = Array.from({ length: 20 }, (_unused, index) =>
      buildTagUsage(`Tag ${index}`, 20 - index),
    );

    const result = resolveTagEditorSuggestions(manyTagUsage, [], '');

    assert.equal(result.length, TAG_EDITOR_SUGGESTION_CAP);
    assert.deepEqual(result, manyTagUsage.slice(0, 12).map((usage) => usage.tag));
  });

  it('returns an empty list when no eligible tag remains', () => {
    assert.deepEqual(
      resolveTagEditorSuggestions(AVAILABLE_TAG_USAGE, [], 'nonexistent'),
      [],
    );
  });

  it('excludes a tag that exactly matches the active segment, case-insensitively', () => {
    assert.deepEqual(
      resolveTagEditorSuggestions(AVAILABLE_TAG_USAGE, [], 'warmup'),
      [],
    );
  });
});

describe('removeTagEditorInputActiveSegment', () => {
  it('clears the whole input when there is no comma yet', () => {
    assert.equal(removeTagEditorInputActiveSegment('Sop'), '');
  });

  it('drops only the active segment, preserving one earlier typed tag', () => {
    assert.equal(removeTagEditorInputActiveSegment('Alto, Sop'), 'Alto');
  });

  it('preserves multiple earlier typed tags before the last comma', () => {
    assert.equal(
      removeTagEditorInputActiveSegment('Alto, Tenor, War'),
      'Alto, Tenor',
    );
  });

  it('drops a trailing comma with an empty active segment', () => {
    assert.equal(removeTagEditorInputActiveSegment('Alto, '), 'Alto');
  });
});
