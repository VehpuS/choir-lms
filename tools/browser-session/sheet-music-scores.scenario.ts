// Sheet music beyond PDF: the full-length MusicXML arrangement as `.musicxml`
// and as `.mxl` (zipped here from the same file), and the MIDI arrangement
// turned into notation by the lazily loaded midi-notation package. Scores are
// web links whose bytes the browser session serves.
import JSZip from 'jszip';

import {
  CHOIR_MIDI_FILE,
  CHOIR_MUSICXML_FILE,
  readFixtureBytes,
} from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';
import {
  buildMockPdfSheetMusic,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTrackMenu, waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

const XML_URL = 'https://mock-scores.test/arrangement.musicxml';
const MXL_URL = 'https://mock-scores.test/arrangement.mxl';
const MID_URL = 'https://mock-scores.test/arrangement.mid';

const WAIT_MS = 20_000;
const ARRANGEMENT_PARTS = [
  'Soprano',
  'Mezzo-soprano',
  'Alto',
  'Tenor',
  'Baritone',
  'Bass',
  'Beatbox',
];
const MIDI_PARTS = [
  'Track 1',
  'Mezzo-soprano',
  'Alto',
  'Tenor',
  'Baritone',
  'Bass',
  'Beatbox',
];

const tracks = [
  {
    name: 'XML Track',
    label: 'XML score',
    url: XML_URL,
    format: 'musicxml' as const,
  },
  {
    name: 'MXL Track',
    label: 'MXL score',
    url: MXL_URL,
    format: 'musicxml' as const,
  },
  {
    name: 'MIDI Track',
    label: 'MIDI score',
    url: MID_URL,
    format: 'midi' as const,
  },
];

const scores = [
  {
    track: 'XML Track',
    label: 'XML score',
    listedAs: 'MusicXML',
    parts: ARRANGEMENT_PARTS,
    shot: '1-musicxml',
    pass: 'A full MusicXML score (.musicxml, 7 parts, 861 measures) opens with a chip for every part',
  },
  {
    track: 'MXL Track',
    label: 'MXL score',
    listedAs: 'MusicXML',
    parts: ARRANGEMENT_PARTS,
    shot: '2-mxl',
    pass: 'The same score compressed as .mxl opens with the same parts',
  },
  {
    track: 'MIDI Track',
    label: 'MIDI score',
    listedAs: 'MIDI',
    parts: MIDI_PARTS,
    shot: '3-midi',
    pass: 'A MIDI file is turned into notation with its parts listed',
  },
];

const buildMxl = async (): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>',
  );
  zip.file('score.xml', readFixtureBytes(CHOIR_MUSICXML_FILE));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};

void (async () => {
  const mxl = await buildMxl();
  await runScenario({
    library: {
      playlists: [],
      sources: tracks.map((t) =>
        buildMockSource(t.name, {
          sheetMusic: [
            buildMockPdfSheetMusic(t.label, t.url, { format: t.format }),
          ],
        }),
      ),
    },
    steps: async ({ page, pass, shot }) => {
      await waitForTrack(page, 'XML Track');

      for (const score of scores) {
        await openTrackMenu(page, score.track);
        await page.getByText('Sheet music', { exact: true }).last().click();
        await page.getByText(score.label).first().waitFor({ timeout: WAIT_MS });
        await page
          .getByText(score.listedAs, { exact: true })
          .first()
          .waitFor({ timeout: WAIT_MS });
        await page.getByText('View', { exact: true }).first().click();

        // The score is drawn, and every part of the arrangement has a chip.
        await page.locator('svg').nth(0).waitFor({ timeout: WAIT_MS });
        for (const part of score.parts) {
          await page
            .getByText(part, { exact: true })
            .first()
            .waitFor({ timeout: WAIT_MS });
        }
        await shot(score.shot);
        pass(score.pass);

        await page.getByLabel('Close sheet music').click();
        await page
          .getByLabel('Close sheet music')
          .waitFor({ state: 'detached', timeout: WAIT_MS });
        await page.getByText('Done', { exact: true }).last().click();
      }
    },
    webFiles: {
      [XML_URL]: {
        body: readFixtureBytes(CHOIR_MUSICXML_FILE),
        contentType: 'application/vnd.recordare.musicxml+xml',
      },
      [MXL_URL]: {
        body: mxl,
        contentType: 'application/vnd.recordare.musicxml',
      },
      [MID_URL]: {
        body: readFixtureBytes(CHOIR_MIDI_FILE),
        contentType: 'audio/midi',
      },
    },
  });
})();
