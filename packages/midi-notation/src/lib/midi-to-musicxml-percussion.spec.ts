import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractScoreParts } from '@org/audio-library-models';

import { convertMidiToMusicXml } from './midi-to-musicxml.ts';
import { buildMidiFile, sixteenths } from './midi-notation-test-support.ts';

const DRUM_CHANNEL = 9;
const KICK = 36;
const SNARE = 38;
const CLOSED_HAT = 42;

/** The XML of the part with the given id. */
const partXml = (xml: string | undefined, id: string): string => {
  return (
    new RegExp(`<part id="${id}">([\\s\\S]*?)</part>`).exec(xml ?? '')?.[1] ??
    ''
  );
};

describe('convertMidiToMusicXml with a beatbox part', () => {
  // A kick and a closed hat together, then a snare with a hat, one bar.
  const beatbox = {
    channel: DRUM_CHANNEL,
    name: 'Beatbox',
    notes: [
      sixteenths(KICK, 0, 1),
      sixteenths(CLOSED_HAT, 0, 1),
      sixteenths(CLOSED_HAT, 4, 1),
      sixteenths(SNARE, 8, 1),
      sixteenths(CLOSED_HAT, 8, 1),
      sixteenths(CLOSED_HAT, 12, 1),
    ],
  };
  const result = convertMidiToMusicXml(
    buildMidiFile({
      key: { fifths: 2 },
      tracks: [{ name: 'Alto', notes: [sixteenths(65, 0, 16)] }, beatbox],
    }),
    { pickupSixteenths: 0 },
  );
  const drums = partXml(result?.musicXml, 'P2');

  it('is listed as a vocal part, with the singers, not hidden as an instrument', () => {
    assert.deepEqual(
      extractScoreParts(result?.musicXml ?? '').map(({ name, kind }) => [
        name,
        kind,
      ]),
      [
        ['Alto', 'vocal'],
        ['Beatbox', 'vocal'],
      ],
    );
  });

  it('uses the percussion clef and writes unpitched notes at their drum positions', () => {
    assert.match(drums, /<clef><sign>percussion<\/sign><\/clef>/);
    assert.doesNotMatch(drums, /<pitch>/);
    assert.match(
      drums,
      /<unpitched><display-step>E<\/display-step><display-octave>4<\/display-octave><\/unpitched>/,
    );
    assert.match(
      drums,
      /<unpitched><display-step>C<\/display-step><display-octave>5<\/display-octave><\/unpitched>/,
    );
  });

  it('writes the hi-hat with an x head and drums with a normal head', () => {
    const hatNotes = drums.match(
      /<note>(?:<chord\/>)?<unpitched><display-step>G<\/display-step>[\s\S]*?<\/note>/g,
    );

    assert.ok(hatNotes && hatNotes.length >= 3);
    assert.ok(
      hatNotes.every((note) => note.includes('<notehead>x</notehead>')),
    );
    assert.doesNotMatch(
      /<unpitched><display-step>E<\/display-step>[\s\S]*?<\/note>/.exec(
        drums,
      )?.[0] ?? '',
      /notehead/,
    );
  });

  it('writes hits that start together as one chord and never changes key', () => {
    // The kick and the hat on the first beat: a second note marked as a chord.
    assert.match(drums, /<chord\/><unpitched>/);
    assert.doesNotMatch(drums, /<key>[\s\S]*<fifths>2/);
    assert.match(drums, /<fifths>0<\/fifths>/);
  });

  it('keeps the pitched part and its key as before', () => {
    const alto = partXml(result?.musicXml, 'P1');

    assert.match(alto, /<fifths>2<\/fifths>/);
    assert.match(alto, /<pitch>/);
  });

  it('draws a file with only drums, and takes its key from nothing', () => {
    const onlyDrums = convertMidiToMusicXml(
      buildMidiFile({ tracks: [beatbox] }),
      { pickupSixteenths: 0 },
    );

    assert.equal(onlyDrums?.partCount, 1);
    assert.match(onlyDrums?.musicXml ?? '', /<unpitched>/);
  });
});
