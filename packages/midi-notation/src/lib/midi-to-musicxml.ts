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
import { normalizeHitLengths } from './midi-notation-percussion.ts';
import {
  UNITS_PER_WHOLE_NOTE,
  buildBars,
  buildKeyChanges,
  buildMeterMap,
  meterBarLength,
} from './midi-notation-bars.ts';
import { UNITS_PER_SIXTEENTH } from './midi-notation-triplets.ts';
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

/** Refuse files that would produce an unreasonably large score. */
const MAX_BARS = 500;
const MAX_NOTES = 50_000;

/**
 * Turns a Standard MIDI File into MusicXML so MIDI and MusicXML share one
 * renderer and one part filter. MIDI is performance data, so the notation is
 * an approximation: notes are snapped to a 16th grid, or to eighth-note
 * triplets in the beats that fit them better; time and key signature changes
 * are followed (a change that falls inside a bar takes effect from the next
 * bar for a key, and cuts the bar short for a time signature); black keys are
 * spelled from the key alone; and a performed (not score-exported) file will
 * look rough.
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

  // A drum or beatbox track is written too, unpitched, on a percussion staff.
  const tracks = midi.tracks
    .map((track, trackIndex) => ({
      isPercussion: track.channel === PERCUSSION_CHANNEL_INDEX,
      track,
      trackIndex,
    }))
    .filter(({ track }) => track.notes.length > 0);
  // Key, pickup, and clef come from pitched lines; drums only when there are none.
  const pitchedTracks = tracks.filter(({ isPercussion }) => !isPercussion);
  const guideTracks = pitchedTracks.length > 0 ? pitchedTracks : tracks;
  const noteCount = tracks.reduce(
    (sum, { track }) => sum + track.notes.length,
    0,
  );

  if (tracks.length === 0 || noteCount > MAX_NOTES) {
    return undefined;
  }

  const timeSignatures = midi.header.timeSignatures;
  const firstMeter = buildMeterMap(timeSignatures, midi.header.ppq)[0] ?? {
    beatType: 4,
    beats: 4,
    startUnit: 0,
  };
  const barLength = meterBarLength(firstMeter);
  // A file whose time signature changes already says where its bars fall, so
  // the pickup guess (which assumes one bar length) is left out for it.
  const hasMeterChanges =
    buildMeterMap(timeSignatures, midi.header.ppq).length > 1;
  const pickup =
    options.pickupSixteenths ??
    (hasMeterChanges
      ? 0
      : detectPickupSixteenths(
          guideTracks.flatMap(({ track }) => track.notes),
          midi.header.ppq,
          barLength / UNITS_PER_SIXTEENTH,
        ));
  const pickupUnits = pickup * UNITS_PER_SIXTEENTH;
  const offset =
    pickupUnits > 0 && pickupUnits < barLength ? barLength - pickupUnits : 0;
  const allPitches = guideTracks.flatMap(({ track }) =>
    track.notes.map((n) => n.midi),
  );
  const keyChanges = buildKeyChanges(
    midi.header.keySignatures.map((key) => ({
      fifths: fifthsFromKeyName(key.key),
      ticks: key.ticks,
    })),
    midi.header.ppq,
    offset,
  );
  const fifthsFromFile = keyChanges[0]?.fifths;
  const defaultFifths = fifthsFromFile ?? inferFifths(allPitches);

  const parts = tracks.map(({ isPercussion, track, trackIndex }) => {
    const rawNotes = track.notes.map((note) => ({
      durationTicks: note.durationTicks,
      midi: note.midi,
      ticks: note.ticks,
    }));
    const { notes, tripletWindows } = quantizeNotes(
      isPercussion ? normalizeHitLengths(rawNotes, midi.header.ppq) : rawNotes,
      {
        beatLength: UNITS_PER_WHOLE_NOTE / firstMeter.beatType,
        legatoSnap: options.legatoSnapSixteenths ?? DEFAULT_LEGATO_SNAP,
        offset,
        ticksPerQuarter: midi.header.ppq,
      },
    );

    return {
      clef: isPercussion
        ? ({ sign: 'percussion' } as const)
        : chooseClef(notes.map((note) => note.pitch)),
      isPercussion,
      endsAt: Math.max(...notes.map((note) => note.end)),
      name:
        resolveTrackName(midi.tracks, trackIndex) || `Track ${trackIndex + 1}`,
      program: track.instrument.number + 1,
      channel: track.channel + 1,
      tripletWindows,
      voices: assignVoices(groupChords(notes)),
    };
  });
  const bars = buildBars({
    defaultFifths,
    endUnit: Math.max(...parts.map((part) => part.endsAt)),
    keys: fifthsFromFile === undefined ? [] : keyChanges,
    maxBars: MAX_BARS,
    meters: buildMeterMap(timeSignatures, midi.header.ppq, offset),
  });

  if (bars.length > MAX_BARS) {
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
        `<part id="P${index + 1}">${writePartMeasuresXml({ bars: part.isPercussion ? bars.map((bar) => ({ ...bar, fifths: 0 })) : bars, clef: part.clef, isPercussion: part.isPercussion, tripletWindows: part.tripletWindows, voices: part.voices })}</part>`,
    )
    .join('');
  const titleXml = options.title
    ? `<work><work-title>${escapeXml(options.title)}</work-title></work>`
    : '';

  return {
    barCount: bars.length,
    keySource: fifthsFromFile === undefined ? 'inferred' : 'file',
    musicXml: `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1">${titleXml}<part-list>${partList}</part-list>${partBodies}</score-partwise>`,
    partCount: parts.length,
    pickupSixteenths: pickupUnits > 0 && pickupUnits < barLength ? pickup : 0,
  };
};
