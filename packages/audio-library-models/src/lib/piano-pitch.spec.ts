import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isNaturalPitch,
  midiToFrequency,
  midiToNoteName,
  midiToPitchName,
  musicXmlPitchToMidi,
  semitonePitchToMidi,
  PIANO_HIGHEST_MIDI,
  PIANO_LOWEST_MIDI,
} from './piano-pitch.js';

describe('note names', () => {
  it('names the ends of the piano and middle C', () => {
    assert.equal(midiToNoteName(PIANO_LOWEST_MIDI), 'A0');
    assert.equal(midiToNoteName(PIANO_HIGHEST_MIDI), 'C8');
    assert.equal(midiToNoteName(60), 'C4');
  });

  it('spells black keys as sharps or flats', () => {
    assert.equal(midiToNoteName(70), 'A♯4');
    assert.equal(midiToNoteName(70, 'flats'), 'B♭4');
    assert.equal(midiToPitchName(61, 'flats'), 'D♭');
  });

  it('tells natural keys from black keys', () => {
    assert.equal(isNaturalPitch(60), true);
    assert.equal(isNaturalPitch(61), false);
    assert.equal(isNaturalPitch(PIANO_LOWEST_MIDI + 1), false);
  });
});

describe('frequency', () => {
  it('puts A4 at 440 Hz and doubles each octave', () => {
    assert.equal(midiToFrequency(69), 440);
    assert.equal(midiToFrequency(81), 880);
    assert.ok(Math.abs(midiToFrequency(60) - 261.6256) < 0.001);
  });
});

describe('MusicXML pitch to sounding MIDI', () => {
  it('reads natural, sharp, and flat notes', () => {
    assert.equal(musicXmlPitchToMidi({ step: 'C', octave: 4 }), 60);
    assert.equal(musicXmlPitchToMidi({ step: 'A', octave: 0 }), 21);
    assert.equal(musicXmlPitchToMidi({ step: 'C', octave: 8 }), 108);
    assert.equal(musicXmlPitchToMidi({ step: 'F', alter: 1, octave: 4 }), 66);
    assert.equal(musicXmlPitchToMidi({ step: 'B', alter: -1, octave: 4 }), 70);
  });

  it('adds a part transposition to the written pitch', () => {
    // Written C5 in a part that sounds a major second lower is B♭4.
    assert.equal(
      musicXmlPitchToMidi({ step: 'C', octave: 5 }, { chromatic: -2 }),
      70,
    );
    assert.equal(
      musicXmlPitchToMidi(
        { step: 'C', octave: 4 },
        { chromatic: 0, octaveChange: -1 },
      ),
      48,
    );
  });

  it('returns null for an unknown step', () => {
    assert.equal(musicXmlPitchToMidi({ step: 'H', octave: 4 }), null);
  });
});

describe('semitone pitch to MIDI', () => {
  it('matches the MusicXML reading for the same note', () => {
    // B♭4: B is 11 semitones above C, flattened once.
    assert.equal(
      semitonePitchToMidi({ semitone: 11, alter: -1, octave: 4 }),
      70,
    );
    assert.equal(
      semitonePitchToMidi({ semitone: 0, octave: 5 }, { chromatic: -2 }),
      70,
    );
  });
});
