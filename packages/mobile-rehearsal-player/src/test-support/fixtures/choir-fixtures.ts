import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Committed media and score fixtures for the browser scenarios, read as bytes
// or text. They are the owner's own recording and arrangements, kept full
// length on purpose so the app is not tested only on toy input. Stored in Git
// without LFS (see the `broad-browser-tests` design).
const FIXTURE_DIR = __dirname;

/** The fixture directory budget; past it, revisit Git LFS (design.md). */
export const FIXTURE_DIR_BUDGET_BYTES = 10 * 1024 * 1024;

export const CHOIR_STEM_FILE = 'choir-stem.m4a';
export const CHOIR_MUSICXML_FILE = 'choir-arrangement.musicxml';
export const CHOIR_MIDI_FILE = 'choir-arrangement.mid';

/**
 * The notes the stem sings, in order: E4, C#4, then C4. Pitch scenarios assert
 * this progression from the stem (about 3.3 s, 16 kHz mono AAC).
 */
export const CHOIR_STEM_NOTES = ['E4', 'C#4', 'C4'] as const;

/** The parts of the arrangement, in score order (both the XML and the MIDI). */
export const CHOIR_ARRANGEMENT_PART_COUNT = 7;

export const fixturePath = (fileName: string): string =>
  join(FIXTURE_DIR, fileName);

export const readFixtureBytes = (fileName: string): Buffer =>
  readFileSync(fixturePath(fileName));

export const readFixtureText = (fileName: string): string =>
  readFileSync(fixturePath(fileName), 'utf8');
