import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRequire } from 'node:module';

import type { Midi as MidiClass } from '@tonejs/midi';

import { resolveScoreMusicXml } from './score-music-xml.js';

// Fixtures only: Node loads the CommonJS writer through `require`.
const { Midi } = createRequire(import.meta.url)('@tonejs/midi') as {
  Midi: typeof MidiClass;
};

const buildMidi = (): Uint8Array => {
  const midi = new Midi();
  const track = midi.addTrack();

  track.name = 'Alto';
  track.addNote({ durationTicks: 1920, midi: 65, ticks: 0 });

  return midi.toArray();
};

describe('resolveScoreMusicXml', () => {
  it('converts MIDI to MusicXML and reports where it came from', async () => {
    const result = await resolveScoreMusicXml({
      bytes: buildMidi(),
      format: 'midi',
      isCompressed: false,
    });

    assert.equal(result?.origin, 'midi');
    assert.match(result?.musicXml ?? '', /<part-name>Alto<\/part-name>/);
  });

  it('passes MusicXML text through', async () => {
    const xml = '<score-partwise><part-list/></score-partwise>';
    const result = await resolveScoreMusicXml({
      bytes: new TextEncoder().encode(xml),
      format: 'musicxml',
      isCompressed: false,
    });

    assert.deepEqual(result, { musicXml: xml, origin: 'musicxml' });
  });

  it('returns null for bytes that are not a score', async () => {
    for (const format of ['midi', 'musicxml'] as const) {
      assert.equal(
        await resolveScoreMusicXml({
          bytes: new TextEncoder().encode('<html/>'),
          format,
          isCompressed: false,
        }),
        null,
        format,
      );
    }
  });
});
