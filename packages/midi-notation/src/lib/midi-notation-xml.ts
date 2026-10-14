import { GRID_PER_QUARTER, type GridEvent } from './midi-notation-quantize.ts';
import {
  spellPitch,
  type NotationClef,
  type SpelledPitch,
} from './midi-notation-pitch.ts';

// Note values in 16ths, largest first, with their MusicXML type and dots.
const NOTE_VALUES: ReadonlyArray<{
  dotted: boolean;
  size: number;
  type: string;
}> = [
  { dotted: false, size: 16, type: 'whole' },
  { dotted: true, size: 12, type: 'half' },
  { dotted: false, size: 8, type: 'half' },
  { dotted: true, size: 6, type: 'quarter' },
  { dotted: false, size: 4, type: 'quarter' },
  { dotted: true, size: 3, type: 'eighth' },
  { dotted: false, size: 2, type: 'eighth' },
  { dotted: false, size: 1, type: '16th' },
];

const XML_ESCAPES: Record<string, string> = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&apos;',
  '<': '&lt;',
  '>': '&gt;',
};
const XML_ESCAPE_PATTERN = /[&<>"']/g;
const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const FIRST_PRINTABLE = 0x20;

// XML 1.0 forbids most control characters, and a track name read from a binary
// file can hold them.
const isAllowedXmlCharacter = (character: string): boolean => {
  const code = character.charCodeAt(0);

  return (
    code >= FIRST_PRINTABLE ||
    code === TAB ||
    code === LINE_FEED ||
    code === CARRIAGE_RETURN
  );
};

export const escapeXml = (text: string): string => {
  return [...text]
    .filter(isAllowedXmlCharacter)
    .join('')
    .replace(
      XML_ESCAPE_PATTERN,
      (character) => XML_ESCAPES[character] ?? character,
    );
};

/** Splits a length in 16ths into the written note values that add up to it. */
export const splitIntoNoteValues = (length: number) => {
  const pieces: Array<(typeof NOTE_VALUES)[number]> = [];
  let remaining = length;

  for (const value of NOTE_VALUES) {
    while (remaining >= value.size) {
      pieces.push(value);
      remaining -= value.size;
    }
  }

  return pieces;
};

const pitchXml = ({ alter, octave, step }: SpelledPitch) => {
  const alterXml = alter === 0 ? '' : `<alter>${alter}</alter>`;

  return `<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`;
};

type SliceTies = { fromPrevious: boolean; toNext: boolean };

/** One written note value (a chord, or a rest when `pitches` is empty). */
const pieceXml = (options: {
  dotted: boolean;
  fifths: number;
  isFirst: boolean;
  isLast: boolean;
  pitches: readonly number[];
  size: number;
  ties: SliceTies;
  type: string;
  voice: number;
}) => {
  const isTiedBack = !options.isFirst || options.ties.fromPrevious;
  const isTiedOn = !options.isLast || options.ties.toNext;
  const tieXml = [
    isTiedBack ? '<tie type="stop"/>' : '',
    isTiedOn ? '<tie type="start"/>' : '',
  ].join('');
  const notationXml = [
    isTiedBack ? '<tied type="stop"/>' : '',
    isTiedOn ? '<tied type="start"/>' : '',
  ].join('');
  const dotXml = options.dotted ? '<dot/>' : '';
  const tail = `<duration>${options.size}</duration>`;
  const common = `<voice>${options.voice}</voice><type>${options.type}</type>${dotXml}`;

  if (options.pitches.length === 0) {
    return `<note><rest/>${tail}${common}</note>`;
  }

  return options.pitches
    .map((pitch, index) => {
      const chordXml = index === 0 ? '' : '<chord/>';
      const notations = notationXml
        ? `<notations>${notationXml}</notations>`
        : '';

      return `<note>${chordXml}${pitchXml(spellPitch(pitch, options.fifths))}${tail}${tieXml}${common}${notations}</note>`;
    })
    .join('');
};

const writeRestsXml = (
  from: number,
  to: number,
  voice: number,
  fifths: number,
) => {
  return splitIntoNoteValues(to - from)
    .map(({ dotted, size, type }) =>
      pieceXml({
        dotted,
        fifths,
        isFirst: true,
        isLast: true,
        pitches: [],
        size,
        ties: { fromPrevious: false, toNext: false },
        type,
        voice,
      }),
    )
    .join('');
};

const writeEventSliceXml = (
  event: GridEvent,
  slice: { end: number; start: number },
  voice: number,
  fifths: number,
) => {
  const ties: SliceTies = {
    fromPrevious: event.start < slice.start,
    toNext: event.end > slice.end,
  };
  const pieces = splitIntoNoteValues(slice.end - slice.start);

  return pieces
    .map(({ dotted, size, type }, index) =>
      pieceXml({
        dotted,
        fifths,
        isFirst: index === 0,
        isLast: index === pieces.length - 1,
        pitches: event.pitches,
        size,
        ties,
        type,
        voice,
      }),
    )
    .join('');
};

const writeVoiceBarXml = (
  events: readonly GridEvent[],
  bar: { end: number; start: number },
  voice: number,
  fifths: number,
) => {
  let xml = '';
  let cursor = bar.start;

  for (const event of events) {
    if (event.end <= bar.start || event.start >= bar.end) {
      continue;
    }

    const slice = {
      end: Math.min(event.end, bar.end),
      start: Math.max(event.start, bar.start),
    };

    xml += writeRestsXml(cursor, slice.start, voice, fifths);
    xml += writeEventSliceXml(event, slice, voice, fifths);
    cursor = slice.end;
  }

  return xml + writeRestsXml(cursor, bar.end, voice, fifths);
};

const attributesXml = (options: {
  barLength: number;
  beatType: number;
  beats: number;
  clef: NotationClef;
  fifths: number;
}) => {
  const { clef } = options;
  const octaveXml =
    clef.octaveChange === undefined
      ? ''
      : `<clef-octave-change>${clef.octaveChange}</clef-octave-change>`;

  return `<attributes><divisions>${GRID_PER_QUARTER}</divisions><key><fifths>${options.fifths}</fifths></key><time><beats>${options.beats}</beats><beat-type>${options.beatType}</beat-type></time><clef><sign>${clef.sign}</sign><line>${clef.line}</line>${octaveXml}</clef></attributes>`;
};

/**
 * Writes one part's measures. A note that crosses a barline is split and tied
 * across it; a second voice appears only in the bars where it has notes.
 */
export const writePartMeasuresXml = (options: {
  barCount: number;
  barLength: number;
  beatType: number;
  beats: number;
  clef: NotationClef;
  fifths: number;
  voices: readonly GridEvent[][];
}): string => {
  let xml = '';

  for (let barIndex = 0; barIndex < options.barCount; barIndex += 1) {
    const bar = {
      end: (barIndex + 1) * options.barLength,
      start: barIndex * options.barLength,
    };
    let measure = `<measure number="${barIndex + 1}">`;

    if (barIndex === 0) {
      measure += attributesXml(options);
    }

    let hasWrittenVoice = false;

    options.voices.forEach((events, index) => {
      const isEmpty = !events.some(
        (event) => event.end > bar.start && event.start < bar.end,
      );

      // The first voice always writes the bar (a rest if need be); later
      // voices appear only where they have notes.
      if (isEmpty && index > 0) {
        return;
      }

      if (hasWrittenVoice) {
        measure += `<backup><duration>${options.barLength}</duration></backup>`;
      }

      measure += writeVoiceBarXml(events, bar, index + 1, options.fifths);
      hasWrittenVoice = true;
    });

    xml += `${measure}</measure>`;
  }

  return xml;
};
