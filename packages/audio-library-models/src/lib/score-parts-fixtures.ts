/** Small MusicXML fixtures for the part extraction specs; only the part list matters. */

type FixturePart = {
  abbreviation?: string;
  id: string;
  instrument?: string;
  midiProgram?: number;
  name?: string;
};

const renderPart = (part: FixturePart): string => {
  return [
    `<score-part id="${part.id}">`,
    part.name === undefined
      ? '<part-name/>'
      : `<part-name>${part.name}</part-name>`,
    part.abbreviation === undefined
      ? ''
      : `<part-abbreviation>${part.abbreviation}</part-abbreviation>`,
    part.instrument === undefined
      ? ''
      : `<score-instrument id="${part.id}-I1"><instrument-name>${part.instrument}</instrument-name></score-instrument>`,
    part.midiProgram === undefined
      ? ''
      : `<midi-instrument id="${part.id}-I1"><midi-channel>1</midi-channel><midi-program>${part.midiProgram}</midi-program></midi-instrument>`,
    '</score-part>',
  ].join('');
};

export const buildMusicXml = (
  parts: readonly FixturePart[],
  root: 'score-partwise' | 'score-timewise' = 'score-partwise',
): string => {
  const partList = parts.map(renderPart).join('\n');
  const bodies = parts
    .map((part) => `<part id="${part.id}"><measure number="1"/></part>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- <score-part id="COMMENTED"><part-name>Soprano</part-name></score-part> -->
<${root} version="3.1">
<part-list>
${partList}
</part-list>
${bodies}
</${root}>`;
};

export const SATB_SCORE = buildMusicXml([
  { id: 'P1', name: 'Soprano', abbreviation: 'S.', midiProgram: 53 },
  { id: 'P2', name: 'Alto', abbreviation: 'A.', midiProgram: 53 },
  { id: 'P3', name: 'Tenor', abbreviation: 'T.', midiProgram: 53 },
  { id: 'P4', name: 'Bass', abbreviation: 'B.', midiProgram: 53 },
]);

export const PIANO_VOCAL_SCORE = buildMusicXml([
  { id: 'P1', name: 'Voice', midiProgram: 54 },
  {
    id: 'P2',
    name: 'Piano',
    instrument: 'Acoustic Grand Piano',
    midiProgram: 1,
  },
]);

export const PART_ONLY_FILE = buildMusicXml([
  { id: 'P1', name: 'Alto II', abbreviation: 'A2' },
]);

export const UNNAMED_PARTS_SCORE = buildMusicXml([
  { id: 'P1' },
  { id: 'P2', midiProgram: 54 },
  { id: 'P3', abbreviation: 'Pt.', midiProgram: 1 },
]);

// One staff holding several voices is still one declared part.
export const SHARED_STAFF_SCORE = buildMusicXml([
  { id: 'P1', name: 'Soprano &amp; Alto', abbreviation: 'S/A' },
  { id: 'P2', name: 'Tenor/Bass' },
]);

export const MIXED_INSTRUMENT_NAMES_SCORE = buildMusicXml([
  { id: 'P1', name: 'Alto Sax' },
  { id: 'P2', name: 'Bass Clarinet' },
  { id: 'P3', name: 'Double Bass' },
  { id: 'P4', name: 'Piano (SATB reduction)' },
  { id: 'P5', name: 'Bass' },
  { id: 'P6', name: 'Chorus' },
]);

export const TIMEWISE_SCORE = buildMusicXml(
  [{ id: 'P1', name: 'Tenor' }],
  'score-timewise',
);
