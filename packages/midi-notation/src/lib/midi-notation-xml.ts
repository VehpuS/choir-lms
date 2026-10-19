import type { BarSpec } from './midi-notation-bars.ts';
import type { GridEvent } from './midi-notation-quantize.ts';
import {
  spellPitch,
  type NotationClef,
  type SpelledPitch,
} from './midi-notation-pitch.ts';
import { drumPosition } from './midi-notation-percussion.ts';
import {
  buildPieces,
  markTupletBrackets,
  type Piece,
} from './midi-notation-pieces.ts';
import { UNITS_PER_QUARTER } from './midi-notation-triplets.ts';

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

const pitchXml = ({ alter, octave, step }: SpelledPitch) => {
  const alterXml = alter === 0 ? '' : `<alter>${alter}</alter>`;

  return `<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`;
};

/** A drum note: its position on the staff, with an x head for cymbals. */
const unpitchedXml = (midiNote: number) => {
  const { displayOctave, displayStep, notehead } = drumPosition(midiNote);

  return {
    notehead: notehead ? `<notehead>${notehead}</notehead>` : '',
    pitch: `<unpitched><display-step>${displayStep}</display-step><display-octave>${displayOctave}</display-octave></unpitched>`,
  };
};

/**
 * One written note value: a chord, or a rest when there are no pitches. In a
 * percussion part the numbers are drum sounds, written unpitched.
 */
const pieceXml = (
  piece: Piece,
  voice: number,
  fifths: number,
  isPercussion = false,
) => {
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

      if (isPercussion) {
        const drum = unpitchedXml(pitch);

        return `<note>${chordXml}${drum.pitch}${body}${tieXml}${tail}${drum.notehead}${notations}</note>`;
      }

      return `<note>${chordXml}${pitchXml(spellPitch(pitch, fifths))}${body}${tieXml}${tail}${notations}</note>`;
    })
    .join('');
};

const NO_TIES = { fromPrevious: false, toNext: false };

const writeVoiceBarXml = (
  events: readonly GridEvent[],
  bar: { end: number; start: number },
  voice: number,
  options: {
    fifths: number;
    isPercussion: boolean;
    tripletWindows: ReadonlySet<number>;
  },
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
    .map((piece) =>
      pieceXml(piece, voice, options.fifths, options.isPercussion),
    )
    .join('');
};

const keyXml = (fifths: number) => `<key><fifths>${fifths}</fifths></key>`;
const timeXml = (bar: Pick<BarSpec, 'beatType' | 'beats'>) =>
  `<time><beats>${bar.beats}</beats><beat-type>${bar.beatType}</beat-type></time>`;

/** The first measure's attributes: divisions, key, time signature, and clef. */
const clefXml = (clef: NotationClef) => {
  if (clef.sign === 'percussion') {
    return '<clef><sign>percussion</sign></clef>';
  }

  const octaveXml =
    clef.octaveChange === undefined
      ? ''
      : `<clef-octave-change>${clef.octaveChange}</clef-octave-change>`;

  return `<clef><sign>${clef.sign}</sign><line>${clef.line}</line>${octaveXml}</clef>`;
};

const attributesXml = (bar: BarSpec, clef: NotationClef) => {
  return `<attributes><divisions>${UNITS_PER_QUARTER}</divisions>${keyXml(bar.fifths)}${timeXml(bar)}${clefXml(clef)}</attributes>`;
};

/** A later measure's attributes: only the key and time signature that changed. */
const changedAttributesXml = (previous: BarSpec, bar: BarSpec) => {
  const key = previous.fifths === bar.fifths ? '' : keyXml(bar.fifths);
  const time =
    previous.beats === bar.beats && previous.beatType === bar.beatType
      ? ''
      : timeXml(bar);

  return key || time ? `<attributes>${key}${time}</attributes>` : '';
};

/**
 * Writes one part's measures. A note that crosses a barline is split and tied
 * across it; a second voice appears only in the bars where it has notes;
 * notes in triplet windows are written as bracketed triplets. Each bar has its
 * own length, time signature, and key, written where they change.
 */
export const writePartMeasuresXml = (options: {
  bars: readonly BarSpec[];
  clef: NotationClef;
  /** A drum part: notes are unpitched and the key never changes. */
  isPercussion?: boolean;
  tripletWindows: ReadonlySet<number>;
  voices: readonly GridEvent[][];
}): string => {
  let xml = '';

  options.bars.forEach((bar, barIndex) => {
    const previous = options.bars[barIndex - 1];
    let measure = `<measure number="${barIndex + 1}">`;

    measure += previous
      ? changedAttributesXml(previous, bar)
      : attributesXml(bar, options.clef);

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
        measure += `<backup><duration>${bar.end - bar.start}</duration></backup>`;
      }

      measure += writeVoiceBarXml(events, bar, index + 1, {
        fifths: bar.fifths,
        isPercussion: options.isPercussion ?? false,
        tripletWindows: options.tripletWindows,
      });
      hasWrittenVoice = true;
    });

    xml += `${measure}</measure>`;
  });

  return xml;
};
