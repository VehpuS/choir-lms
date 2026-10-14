import type { GridEvent } from './midi-notation-quantize.ts';
import {
  spellPitch,
  type NotationClef,
  type SpelledPitch,
} from './midi-notation-pitch.ts';
import { UNITS_PER_QUARTER, isTripletAt } from './midi-notation-triplets.ts';

type NoteValue = { dotted: boolean; size: number; type: string };

// Note values in twelfths of a quarter, largest first.
const STRAIGHT_VALUES: readonly NoteValue[] = [
  { dotted: false, size: 48, type: 'whole' },
  { dotted: true, size: 36, type: 'half' },
  { dotted: false, size: 24, type: 'half' },
  { dotted: true, size: 18, type: 'quarter' },
  { dotted: false, size: 12, type: 'quarter' },
  { dotted: true, size: 9, type: 'eighth' },
  { dotted: false, size: 6, type: 'eighth' },
  { dotted: false, size: 3, type: '16th' },
];

// The same note values played three in the time of two.
const TRIPLET_VALUES: readonly NoteValue[] = [
  { dotted: false, size: 8, type: 'quarter' },
  { dotted: false, size: 4, type: 'eighth' },
  { dotted: false, size: 2, type: '16th' },
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
const TIME_MODIFICATION_XML =
  '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';

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

/** Splits a length (in twelfths) into the written note values that add up to it. */
export const splitIntoNoteValues = (
  length: number,
  isTuplet = false,
): NoteValue[] => {
  const pieces: NoteValue[] = [];
  let remaining = length;

  for (const value of isTuplet ? TRIPLET_VALUES : STRAIGHT_VALUES) {
    while (remaining >= value.size) {
      pieces.push(value);
      remaining -= value.size;
    }
  }

  return pieces;
};

type Segment = { from: number; isTuplet: boolean; to: number };

/**
 * Cuts a span at the edges of triplet windows where it begins or ends inside
 * one, so the part inside the window is written as triplets and the rest as
 * ordinary notes. A note that merely passes over a triplet window, or fills a
 * whole beat of one, stays ordinary.
 */
const splitIntoSegments = (
  from: number,
  to: number,
  tripletWindows: ReadonlySet<number>,
): Segment[] => {
  const cuts = [from];
  const startsInside =
    from % UNITS_PER_QUARTER !== 0 && isTripletAt(from, tripletWindows);
  const endsInside =
    to % UNITS_PER_QUARTER !== 0 && isTripletAt(to, tripletWindows);
  const startEdge = Math.ceil(from / UNITS_PER_QUARTER) * UNITS_PER_QUARTER;
  const endEdge = Math.floor(to / UNITS_PER_QUARTER) * UNITS_PER_QUARTER;

  if (startsInside && startEdge < to) {
    cuts.push(startEdge);
  }

  if (endsInside && endEdge > from && !cuts.includes(endEdge)) {
    cuts.push(endEdge);
  }

  cuts.push(to);

  return cuts.slice(0, -1).map((start, index) => {
    const end = cuts[index + 1] ?? to;
    const isAligned =
      start % UNITS_PER_QUARTER === 0 && end % UNITS_PER_QUARTER === 0;

    return {
      from: start,
      isTuplet: !isAligned && isTripletAt(start, tripletWindows),
      to: end,
    };
  });
};

type Piece = NoteValue & {
  isTiedBack: boolean;
  isTiedOn: boolean;
  isTuplet: boolean;
  pitches: readonly number[];
  start: number;
  tupletStart?: boolean;
  tupletStop?: boolean;
};

/** Breaks a span into written pieces; `ties` mark a note continuing across a barline. */
const buildPieces = (
  span: { from: number; to: number },
  pitches: readonly number[],
  ties: { fromPrevious: boolean; toNext: boolean },
  tripletWindows: ReadonlySet<number>,
): Piece[] => {
  const values = splitIntoSegments(span.from, span.to, tripletWindows).flatMap(
    (segment) => {
      let position = segment.from;

      return splitIntoNoteValues(
        segment.to - segment.from,
        segment.isTuplet,
      ).map((value) => {
        const placed = {
          ...value,
          isTuplet: segment.isTuplet,
          start: position,
        };

        position += value.size;

        return placed;
      });
    },
  );

  return values.map((value, index) => ({
    ...value,
    isTiedBack: index > 0 || ties.fromPrevious,
    isTiedOn: index < values.length - 1 || ties.toNext,
    pitches,
  }));
};

const windowOf = (piece: Piece) => Math.floor(piece.start / UNITS_PER_QUARTER);

/** Marks where each beat's run of triplet pieces begins and ends, for the bracket. */
const markTupletBrackets = (pieces: readonly Piece[]): Piece[] => {
  const sameGroup = (a: Piece | undefined, b: Piece) =>
    a !== undefined && a.isTuplet && windowOf(a) === windowOf(b);

  return pieces.map((piece, index) => {
    if (!piece.isTuplet) {
      return piece;
    }

    return {
      ...piece,
      tupletStart: !sameGroup(pieces[index - 1], piece),
      tupletStop: !sameGroup(pieces[index + 1], piece),
    };
  });
};

const pitchXml = ({ alter, octave, step }: SpelledPitch) => {
  const alterXml = alter === 0 ? '' : `<alter>${alter}</alter>`;

  return `<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`;
};

/** One written note value: a chord, or a rest when there are no pitches. */
const pieceXml = (piece: Piece, voice: number, fifths: number) => {
  const isRest = piece.pitches.length === 0;
  const dotXml = piece.dotted ? '<dot/>' : '';
  const body = `<duration>${piece.size}</duration>`;
  const tail = `<voice>${voice}</voice><type>${piece.type}</type>${dotXml}${piece.isTuplet ? TIME_MODIFICATION_XML : ''}`;
  const tupletXml = [
    piece.tupletStart ? '<tuplet type="start" bracket="yes" number="1"/>' : '',
    piece.tupletStop ? '<tuplet type="stop" number="1"/>' : '',
  ].join('');

  if (isRest) {
    const notations = tupletXml ? `<notations>${tupletXml}</notations>` : '';

    return `<note><rest/>${body}${tail}${notations}</note>`;
  }

  const tieXml = [
    piece.isTiedBack ? '<tie type="stop"/>' : '',
    piece.isTiedOn ? '<tie type="start"/>' : '',
  ].join('');
  const tiedXml = [
    piece.isTiedBack ? '<tied type="stop"/>' : '',
    piece.isTiedOn ? '<tied type="start"/>' : '',
  ].join('');

  return piece.pitches
    .map((pitch, index) => {
      // The bracket belongs to the first note of a chord only.
      const notationsXml = `${tiedXml}${index === 0 ? tupletXml : ''}`;
      const notations = notationsXml
        ? `<notations>${notationsXml}</notations>`
        : '';
      const chordXml = index === 0 ? '' : '<chord/>';

      return `<note>${chordXml}${pitchXml(spellPitch(pitch, fifths))}${body}${tieXml}${tail}${notations}</note>`;
    })
    .join('');
};

const NO_TIES = { fromPrevious: false, toNext: false };

const writeVoiceBarXml = (
  events: readonly GridEvent[],
  bar: { end: number; start: number },
  voice: number,
  options: { fifths: number; tripletWindows: ReadonlySet<number> },
) => {
  const pieces: Piece[] = [];
  let cursor = bar.start;

  for (const event of events) {
    if (event.end <= bar.start || event.start >= bar.end) {
      continue;
    }

    const slice = {
      from: Math.max(event.start, bar.start),
      to: Math.min(event.end, bar.end),
    };

    pieces.push(
      ...buildPieces(
        { from: cursor, to: slice.from },
        [],
        NO_TIES,
        options.tripletWindows,
      ),
      ...buildPieces(
        slice,
        event.pitches,
        {
          fromPrevious: event.start < slice.from,
          toNext: event.end > slice.to,
        },
        options.tripletWindows,
      ),
    );
    cursor = slice.to;
  }

  pieces.push(
    ...buildPieces(
      { from: cursor, to: bar.end },
      [],
      NO_TIES,
      options.tripletWindows,
    ),
  );

  return markTupletBrackets(pieces)
    .map((piece) => pieceXml(piece, voice, options.fifths))
    .join('');
};

const attributesXml = (options: {
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

  return `<attributes><divisions>${UNITS_PER_QUARTER}</divisions><key><fifths>${options.fifths}</fifths></key><time><beats>${options.beats}</beats><beat-type>${options.beatType}</beat-type></time><clef><sign>${clef.sign}</sign><line>${clef.line}</line>${octaveXml}</clef></attributes>`;
};

/**
 * Writes one part's measures. A note that crosses a barline is split and tied
 * across it; a second voice appears only in the bars where it has notes;
 * notes in triplet windows are written as bracketed triplets.
 */
export const writePartMeasuresXml = (options: {
  barCount: number;
  barLength: number;
  beatType: number;
  beats: number;
  clef: NotationClef;
  fifths: number;
  tripletWindows: ReadonlySet<number>;
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

      measure += writeVoiceBarXml(events, bar, index + 1, options);
      hasWrittenVoice = true;
    });

    xml += `${measure}</measure>`;
  }

  return xml;
};
