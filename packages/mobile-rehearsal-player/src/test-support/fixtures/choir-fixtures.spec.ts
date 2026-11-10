import { extractScoreParts } from '@org/audio-library-models';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  CHOIR_ARRANGEMENT_PART_COUNT,
  CHOIR_MIDI_FILE,
  CHOIR_MUSICXML_FILE,
  CHOIR_STEM_FILE,
  FIXTURE_DIR_BUDGET_BYTES,
  fixturePath,
  readFixtureBytes,
  readFixtureText,
} from './choir-fixtures';

const MP4_BRAND_OFFSET = 4;
const MP4_BRAND_END = 12;
const MIDI_HEADER = 'MThd';

describe('choir fixtures', () => {
  it('keeps the fixture directory under the size budget', () => {
    const dir = fixturePath('.');
    const total = readdirSync(dir)
      .map((name) => statSync(fixturePath(name)).size)
      .reduce((sum, size) => sum + size, 0);

    assert.ok(
      total <= FIXTURE_DIR_BUDGET_BYTES,
      `fixtures total ${total} bytes; over the budget, revisit Git LFS (see openspec/changes/broad-browser-tests/design.md)`,
    );
  });

  it('has the stem as an MP4 audio container', () => {
    const bytes = readFixtureBytes(CHOIR_STEM_FILE);
    const header = bytes
      .subarray(MP4_BRAND_OFFSET, MP4_BRAND_END)
      .toString('latin1');

    assert.match(header, /^ftyp/);
  });

  it('has the full MusicXML score with every part', () => {
    const parts = extractScoreParts(readFixtureText(CHOIR_MUSICXML_FILE));

    assert.equal(parts.length, CHOIR_ARRANGEMENT_PART_COUNT);
    assert.deepEqual(
      parts.slice(0, 2).map(({ name }) => name),
      ['Soprano', 'Mezzo-soprano'],
    );
  });

  it('has a Standard MIDI file the notation package can convert', async () => {
    const bytes = readFixtureBytes(CHOIR_MIDI_FILE);

    assert.equal(bytes.subarray(0, MIDI_HEADER.length).toString(), MIDI_HEADER);

    // Imported dynamically: `@org/midi-notation` is the app's lazily loaded
    // project, and Nx forbids static imports of it.
    const { convertMidiToMusicXml } = await import('@org/midi-notation');
    const result = convertMidiToMusicXml(bytes);

    assert.ok(result, 'the MIDI fixture converts to notation');
    assert.equal(result.partCount, CHOIR_ARRANGEMENT_PART_COUNT);
  });
});
