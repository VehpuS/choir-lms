import {
  DEFAULT_LEGATO_SNAP,
  assignVoices,
  groupChords,
  quantizeNotes,
} from './midi-notation-quantize.ts';
import {
  chooseClef,
  fifthsFromKeyName,
  inferFifths,
} from './midi-notation-pitch.ts';
import { detectPickupSixteenths } from './midi-notation-pickup.ts';
import {
  UNITS_PER_QUARTER,
  UNITS_PER_SIXTEENTH,
} from './midi-notation-triplets.ts';
import { escapeXml, writePartMeasuresXml } from './midi-notation-xml.ts';
import {
  PERCUSSION_CHANNEL_INDEX,
  readMidiFile,
  resolveTrackName,
} from './tone-midi.ts';

// This package is the lazily loaded boundary: nothing statically imports it.

export type MidiNotationOptions = {
  /** Gaps up to this many 16ths are closed rather than written as rests. */
  legatoSnapSixteenths?: number;
  /**
   * Length of a pickup (anacrusis) in 16ths. Bar lines are counted from time
   * zero, so a pickup shifts every bar unless this leaves room for it. When
   * left out the file's notes decide (see `detectPickupSixteenths`); 0 forces
   * no pickup.
   */
  pickupSixteenths?: number;
  title?: string;
};

export type MidiNotationResult = {
  barCount: number;
  /** Whether the key came from the file or was guessed from its notes. */
  keySource: 'file' | 'inferred';
  musicXml: string;
  partCount: number;
  /** The pickup length used, in 16ths: given, or detected from the notes; 0 for none. */
  pickupSixteenths: number;
};

const UNITS_PER_WHOLE_NOTE = UNITS_PER_QUARTER * 4;
const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];
/** Refuse files that would produce an unreasonably large score. */
const MAX_BARS = 500;
const MAX_NOTES = 50_000;

const readTimeSignature = (
  value: readonly number[] | undefined,
): [number, number] => {
  const [beats, beatType] = value ?? [];
  const barLength =
    beats && beatType ? (beats * UNITS_PER_WHOLE_NOTE) / beatType : 0;

  return beats && beatType && Number.isInteger(barLength) && barLength > 0
    ? [beats, beatType]
    : DEFAULT_TIME_SIGNATURE;
};

/**
 * Turns a Standard MIDI File into MusicXML so MIDI and MusicXML share one
 * renderer and one part filter. MIDI is performance data, so the notation is
 * an approximation: notes are snapped to a 16th grid, or to eighth-note
 * triplets in the beats that fit them better; the first time signature
 * applies throughout; black keys are spelled from the key alone; and a
 * performed (not score-exported) file will look rough.
 *
 * Returns undefined for bytes that are not MIDI, files without notes, and
 * files too large to notate. Never throws.
 */
export const convertMidiToMusicXml = (
  bytes: ArrayLike<number>,
  options: MidiNotationOptions = {},
): MidiNotationResult | undefined => {
  const midi = readMidiFile(bytes);

  if (!midi) {
    return undefined;
  }

  // Percussion has no pitch to notate.
  const tracks = midi.tracks
    .map((track, trackIndex) => ({ track, trackIndex }))
    .filter(
      ({ track }) =>
        track.notes.length > 0 && track.channel !== PERCUSSION_CHANNEL_INDEX,
    );
  const noteCount = tracks.reduce(
    (sum, { track }) => sum + track.notes.length,
    0,
  );

  if (tracks.length === 0 || noteCount > MAX_NOTES) {
    return undefined;
  }

  const [beats, beatType] = readTimeSignature(
    midi.header.timeSignatures[0]?.timeSignature,
  );
  const barLength = (beats * UNITS_PER_WHOLE_NOTE) / beatType;
  const pickup =
    options.pickupSixteenths ??
    detectPickupSixteenths(
      tracks.flatMap(({ track }) => track.notes),
      midi.header.ppq,
      barLength / UNITS_PER_SIXTEENTH,
    );
  const pickupUnits = pickup * UNITS_PER_SIXTEENTH;
  const offset =
    pickupUnits > 0 && pickupUnits < barLength ? barLength - pickupUnits : 0;
  const allPitches = tracks.flatMap(({ track }) =>
    track.notes.map((n) => n.midi),
  );
  const fileKey = midi.header.keySignatures[0];
  const fifthsFromFile = fifthsFromKeyName(fileKey?.key);
  const fifths = fifthsFromFile ?? inferFifths(allPitches);

  const parts = tracks.map(({ track, trackIndex }) => {
    const { notes, tripletWindows } = quantizeNotes(
      track.notes.map((note) => ({
        durationTicks: note.durationTicks,
        midi: note.midi,
        ticks: note.ticks,
      })),
      {
        beatLength: UNITS_PER_WHOLE_NOTE / beatType,
        legatoSnap: options.legatoSnapSixteenths ?? DEFAULT_LEGATO_SNAP,
        offset,
        ticksPerQuarter: midi.header.ppq,
      },
    );

    return {
      clef: chooseClef(notes.map((note) => note.pitch)),
      endsAt: Math.max(...notes.map((note) => note.end)),
      name:
        resolveTrackName(midi.tracks, trackIndex) || `Track ${trackIndex + 1}`,
      program: track.instrument.number + 1,
      channel: track.channel + 1,
      tripletWindows,
      voices: assignVoices(groupChords(notes)),
    };
  });
  const barCount = Math.ceil(
    Math.max(...parts.map((part) => part.endsAt)) / barLength,
  );

  if (barCount > MAX_BARS) {
    return undefined;
  }

  const partList = parts
    .map(
      (part, index) =>
        `<score-part id="P${index + 1}"><part-name>${escapeXml(part.name)}</part-name><midi-instrument id="P${index + 1}-I1"><midi-channel>${part.channel}</midi-channel><midi-program>${part.program}</midi-program></midi-instrument></score-part>`,
    )
    .join('');
  const partBodies = parts
    .map(
      (part, index) =>
        `<part id="P${index + 1}">${writePartMeasuresXml({ barCount, barLength, beatType, beats, clef: part.clef, fifths, tripletWindows: part.tripletWindows, voices: part.voices })}</part>`,
    )
    .join('');
  const titleXml = options.title
    ? `<work><work-title>${escapeXml(options.title)}</work-title></work>`
    : '';

  return {
    barCount,
    keySource: fifthsFromFile === undefined ? 'inferred' : 'file',
    musicXml: `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1">${titleXml}<part-list>${partList}</part-list>${partBodies}</score-partwise>`,
    partCount: parts.length,
    pickupSixteenths: pickupUnits > 0 && pickupUnits < barLength ? pickup : 0,
  };
};
