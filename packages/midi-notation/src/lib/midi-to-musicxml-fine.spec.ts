import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertMidiToMusicXml } from './midi-to-musicxml.ts';
import {
  PPQ,
  buildMidiFile,
  readParts,
  requireMeasure,
  sixteenths,
} from './midi-notation-test-support.ts';

/** A note in grid units of a 32nd (1.5 of a twelfth of a quarter: 60 ticks at 480 per quarter). */
const THIRTY_SECOND_TICKS = PPQ / 8;
const thirtySeconds = (midi: number, start: number, length: number) => ({
  durationTicks: length * THIRTY_SECOND_TICKS,
  midi,
  ticks: start * THIRTY_SECOND_TICKS,
});

const partXml = (xml: string | undefined, id: string): string =>
  new RegExp(`<part id="${id}">([\\s\\S]*?)</part>`).exec(xml ?? '')?.[1] ?? '';

describe('convertMidiToMusicXml with 32nd notes', () => {
  // A beat of two 16ths and four 32nds (one quarter), then a half and a quarter.
  const line = [
    sixteenths(60, 0, 1),
    sixteenths(62, 1, 1),
    thirtySeconds(64, 4, 1),
    thirtySeconds(65, 5, 1),
    thirtySeconds(67, 6, 1),
    thirtySeconds(69, 7, 1),
    sixteenths(71, 8, 8),
  ];
  const result = convertMidiToMusicXml(
    buildMidiFile({ tracks: [{ name: 'Soprano', notes: line }] }),
    { pickupSixteenths: 0 },
  );
  const xml = partXml(result?.musicXml, 'P1');

  it('writes the 32nds as 32nd notes with their durations at twice the resolution', () => {
    assert.match(xml, /<divisions>24<\/divisions>/);
    assert.equal((xml.match(/<type>32nd<\/type>/g) ?? []).length, 4);

    const bar = readParts(result?.musicXml ?? '').P1?.[0];
    const durations = requireMeasure(bar).notes.map((note) => note.duration);

    // 16th, 16th, then four 32nds (3 each at 24 per quarter), the rest of the bar.
    assert.deepEqual(durations.slice(0, 6), [6, 6, 3, 3, 3, 3]);
  });

  it('keeps the bar exactly one bar long', () => {
    const bar = readParts(result?.musicXml ?? '').P1?.[0];

    const total = requireMeasure(bar).notes.reduce(
      (sum, note) => sum + note.duration,
      0,
    );

    assert.equal(total, 96);
  });

  it('leaves a part without 32nds at the usual twelve divisions', () => {
    const mixed = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          { name: 'Soprano', notes: line },
          { name: 'Alto', notes: [sixteenths(65, 0, 16)] },
        ],
      }),
      { pickupSixteenths: 0 },
    );

    assert.match(partXml(mixed?.musicXml, 'P1'), /<divisions>24<\/divisions>/);
    assert.match(partXml(mixed?.musicXml, 'P2'), /<divisions>12<\/divisions>/);
  });

  it('writes a file with no 32nds exactly as before', () => {
    const plain = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [{ notes: [sixteenths(60, 0, 4), sixteenths(62, 4, 12)] }],
      }),
    );

    assert.match(plain?.musicXml ?? '', /<divisions>12<\/divisions>/);
    assert.doesNotMatch(plain?.musicXml ?? '', /32nd/);
  });

  it('writes a dotted 16th followed by a 32nd', () => {
    const dotted = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          {
            notes: [
              thirtySeconds(60, 0, 3),
              thirtySeconds(62, 3, 1),
              thirtySeconds(64, 4, 1),
              thirtySeconds(65, 5, 1),
              sixteenths(67, 6, 10),
            ],
          },
        ],
      }),
      { pickupSixteenths: 0 },
    );
    const bar = readParts(dotted?.musicXml ?? '').P1?.[0];

    assert.deepEqual(
      requireMeasure(bar)
        .notes.slice(0, 4)
        .map((note) => [note.type, note.duration]),
      [
        ['16th', 9],
        ['32nd', 3],
        ['32nd', 3],
        ['32nd', 3],
      ],
    );
  });
});
