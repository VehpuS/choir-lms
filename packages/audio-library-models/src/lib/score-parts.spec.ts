import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyVocalPart, extractScoreParts } from './score-parts.ts';
import {
  MIXED_INSTRUMENT_NAMES_SCORE,
  PART_ONLY_FILE,
  PIANO_VOCAL_SCORE,
  SATB_SCORE,
  SHARED_STAFF_SCORE,
  TIMEWISE_SCORE,
  UNNAMED_PARTS_SCORE,
} from './score-parts-fixtures.ts';

const summarize = (xml: string) =>
  extractScoreParts(xml).map(({ name, kind }) => [name, kind]);

describe('extractScoreParts', () => {
  it('lists the four voices of a SATB score in order as vocal', () => {
    const parts = extractScoreParts(SATB_SCORE);

    assert.deepEqual(
      parts.map(({ id, index, name, kind, midiProgram }) => ({
        id,
        index,
        name,
        kind,
        midiProgram,
      })),
      [
        { id: 'P1', index: 0, name: 'Soprano', kind: 'vocal', midiProgram: 53 },
        { id: 'P2', index: 1, name: 'Alto', kind: 'vocal', midiProgram: 53 },
        { id: 'P3', index: 2, name: 'Tenor', kind: 'vocal', midiProgram: 53 },
        { id: 'P4', index: 3, name: 'Bass', kind: 'vocal', midiProgram: 53 },
      ],
    );
  });

  it('ignores commented-out parts and reads score-timewise files', () => {
    assert.deepEqual(summarize(SATB_SCORE).length, 4);
    assert.deepEqual(summarize(TIMEWISE_SCORE), [['Tenor', 'vocal']]);
  });

  it('keeps a piano reduction instrumental next to the voice', () => {
    const parts = extractScoreParts(PIANO_VOCAL_SCORE);

    assert.deepEqual(
      parts.map(({ name, kind, instrument }) => [name, kind, instrument]),
      [
        ['Voice', 'vocal', undefined],
        ['Piano', 'instrumental', 'Acoustic Grand Piano'],
      ],
    );
  });

  it('reads a part-only file as one vocal part', () => {
    assert.deepEqual(summarize(PART_ONLY_FILE), [['Alto II', 'vocal']]);
  });

  it('names unnamed parts and trusts only a vocal MIDI program', () => {
    assert.deepEqual(summarize(UNNAMED_PARTS_SCORE), [
      ['Part 1', 'unknown'],
      ['Part 2', 'vocal'],
      ['Pt.', 'unknown'],
    ]);
  });

  it('lists a staff holding several voices as the one part the file declares', () => {
    assert.deepEqual(summarize(SHARED_STAFF_SCORE), [
      ['Soprano & Alto', 'vocal'],
      ['Tenor/Bass', 'vocal'],
    ]);
  });

  it('does not mistake instruments that share a voice name for voices', () => {
    assert.deepEqual(summarize(MIXED_INSTRUMENT_NAMES_SCORE), [
      ['Alto Sax', 'instrumental'],
      ['Bass Clarinet', 'instrumental'],
      ['Double Bass', 'instrumental'],
      ['Piano (SATB reduction)', 'instrumental'],
      ['Bass', 'vocal'],
      ['Chorus', 'vocal'],
    ]);
  });

  it('returns no parts for text that is not a MusicXML score', () => {
    assert.deepEqual(extractScoreParts(''), []);
    assert.deepEqual(
      extractScoreParts('<html><body>Soprano</body></html>'),
      [],
    );
    assert.deepEqual(
      extractScoreParts('<score-partwise></score-partwise>'),
      [],
    );
  });
});

describe('classifyVocalPart', () => {
  it('recognizes voice names, numbered voices, and abbreviations', () => {
    for (const name of [
      'Soprano 1',
      'Mezzo-soprano',
      'Contralto',
      'Baritone',
      'Tenor II',
      'S',
      'A.',
      'T 2',
      'SATB',
      'Vocals',
      'Voice',
    ]) {
      assert.equal(classifyVocalPart({ name }), 'vocal', name);
    }
  });

  it('treats beatbox and vocal percussion as vocal, not as the percussion instrument', () => {
    for (const name of [
      'Beatbox',
      'Beat Box',
      'Vocal Percussion',
      'Beatboxer',
    ]) {
      assert.equal(classifyVocalPart({ name }), 'vocal', name);
    }

    // Real percussion instruments stay instrumental.
    for (const name of ['Percussion', 'Drums', 'Timpani']) {
      assert.equal(classifyVocalPart({ name }), 'instrumental', name);
    }
  });

  it('uses the abbreviation or instrument name when the part name is empty', () => {
    assert.equal(classifyVocalPart({ abbreviation: 'Sop.' }), 'vocal');
    assert.equal(classifyVocalPart({ instrument: 'Choir Aahs' }), 'vocal');
  });

  it('recognizes General MIDI choir and voice programs without a name', () => {
    for (const midiProgram of [53, 54, 55]) {
      assert.equal(classifyVocalPart({ midiProgram }), 'vocal');
    }
    assert.equal(classifyVocalPart({ midiProgram: 1 }), 'unknown');
    assert.equal(classifyVocalPart({ midiProgram: 57 }), 'unknown');
  });

  it('treats an instrument word as instrumental even beside a voice word', () => {
    for (const name of [
      'Piano',
      'Violin I',
      'Bass Guitar',
      'Tenor Sax',
      'Organ',
    ]) {
      assert.equal(classifyVocalPart({ name }), 'instrumental', name);
    }
  });

  it('leaves unrecognized names unknown', () => {
    assert.equal(classifyVocalPart({ name: 'Track 3' }), 'unknown');
    assert.equal(classifyVocalPart({}), 'unknown');
  });
});
