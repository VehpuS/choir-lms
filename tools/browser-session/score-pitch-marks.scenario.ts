import {
  CHOIR_MIDI_FILE,
  CHOIR_MUSICXML_FILE,
  readFixtureBytes,
} from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';
import {
  buildMockPdfSheetMusic,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// The sung note marked on the drawn score. The stem is the microphone and sings
// E4, C♯4, C4 (MIDI 64, 61, 60); with Pitch detection on and a score open, the
// app marks the noteheads tagged with those pitches in turn. Checked for the
// MusicXML score and the MIDI-derived one, and with "Show other-octave
// matches" (soft marks for the same note in other octaves).
const WAIT_MS = 20_000;
const TONE_SECONDS = 60;
const SUNG_MIDI = [64, 61, 60];
// The stem loops about every 4 s; allow a few loops for slow machines.
const SEQUENCE_TIMEOUT_MS = 20_000;
const MARK_STYLE = 'style[data-score-pitch-marks]';
const XML_URL = 'https://mock-scores.test/arrangement.musicxml';
const MID_URL = 'https://mock-scores.test/arrangement.mid';

const xmlTrack = buildMockSource('XML Track', {
  durationMs: TONE_SECONDS * 1000,
  sheetMusic: [
    buildMockPdfSheetMusic('XML score', XML_URL, { format: 'musicxml' }),
  ],
});
const midiTrack = buildMockSource('MIDI Track', {
  durationMs: TONE_SECONDS * 1000,
  sheetMusic: [
    buildMockPdfSheetMusic('MIDI score', MID_URL, { format: 'midi' }),
  ],
});
const tone = buildToneMedia({ seconds: TONE_SECONDS });

/** The pitches the style element marks strongly (a `[data-midi="n"] path` rule). */
const markedMidis = `(() => {
  const style = document.querySelector('${MARK_STYLE}');
  const css = style ? style.textContent : '';
  return [...css.matchAll(/\\[data-midi="(\\d+)"\\] path/g)].map((m) => Number(m[1]));
})()`;
const drawnMidis = `[...new Set([...document.querySelectorAll('[data-midi]')].map((e) => Number(e.getAttribute('data-midi'))))]`;

void runScenario({
  drive: {
    media: { [xmlTrack.driveFileId]: tone, [midiTrack.driveFileId]: tone },
    state: 'authorized',
  },
  library: { playlists: [], sources: [xmlTrack, midiTrack] },
  mediaProbe: true,
  microphone: true,
  steps: async ({ page, pass, shot }) => {
    // Play the XML track and turn Pitch detection on; it stays on for both scores.
    await waitForTrack(page, 'XML Track');
    await page.getByLabel('Play XML Track').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Practice tools').last().click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Got it', { exact: true })
      .click()
      .catch(() => undefined);
    await page.keyboard.press('Escape');
    await page.getByLabel('Dismiss playback').click();

    const openScore = async (track: string, label: string) => {
      await openTrackMenu(page, track);
      await page.getByText('Sheet music', { exact: true }).last().click();
      await page.getByText(label).first().waitFor({ timeout: WAIT_MS });
      await page.getByText('View', { exact: true }).first().click();
      await page.locator('svg').first().waitFor({ timeout: WAIT_MS });
    };

    /** Waits for the marked pitches to run through E4, C♯4, C4 in order. */
    const expectSungSequence = async () => {
      const seen: number[] = [];

      await waitUntil(
        async () => {
          const [midi] = (await page.evaluate(markedMidis)) as number[];

          if (midi !== undefined && seen[seen.length - 1] !== midi) {
            seen.push(midi);
          }
          let next = 0;

          for (const note of seen) {
            if (note === SUNG_MIDI[next]) {
              next += 1;
            }
          }

          return next === SUNG_MIDI.length;
        },
        `the score marked ${seen.join(', ') || 'nothing'}, not ${SUNG_MIDI.join(', ')} in order`,
        SEQUENCE_TIMEOUT_MS,
      );
    };

    // MusicXML: the sung pitches are noteheads in the drawing, and get marked.
    await openScore('XML Track', 'XML score');
    // The drawing fills in as it renders, so wait for the sung pitches to appear.
    await waitUntil(
      async () => {
        const drawn = (await page.evaluate(drawnMidis)) as number[];

        return SUNG_MIDI.every((midi) => drawn.includes(midi));
      },
      `the MusicXML drawing has no noteheads tagged ${SUNG_MIDI.join(', ')}`,
      WAIT_MS,
    );
    await expectSungSequence();
    await shot('1-musicxml-marked');
    pass('The MusicXML score marks E4, C♯4, C4 as they are sung');

    // The marked notehead is painted, not only listed in the style.
    await waitUntil(async () => {
      const [midi] = (await page.evaluate(markedMidis)) as number[];
      const fill = midi
        ? await page.evaluate(
            `(() => { const p = document.querySelector('[data-midi="${midi}"] path'); return p ? getComputedStyle(p).fill : ''; })()`,
          )
        : '';

      return fill === 'rgb(145, 132, 217)';
    }, 'a marked notehead was not painted in the accent colour');
    pass('The marked notehead is painted in the accent colour');

    // Other octaves: the toggle adds soft marks for the same note.
    await page.getByLabel('Show other-octave matches, off').click();
    await page
      .getByLabel('Show other-octave matches, on')
      .waitFor({ timeout: WAIT_MS });
    await waitUntil(async () => {
      const midis = (await page.evaluate(markedMidis)) as number[];

      return midis.length > 1;
    }, 'no other-octave marks were added');
    await shot('2-other-octave');
    await page.getByLabel('Show other-octave matches, on').click();
    await page.getByLabel('Close sheet music').click();
    await page.getByText('Done', { exact: true }).last().click();
    pass(
      'Show other-octave matches adds marks for the same note in other octaves',
    );

    // MIDI-derived notation is marked the same way.
    await openScore('MIDI Track', 'MIDI score');
    await expectSungSequence();
    await shot('3-midi-marked');
    pass('The MIDI-derived score marks E4, C♯4, C4 as they are sung');
  },
  webFiles: {
    [XML_URL]: {
      body: readFixtureBytes(CHOIR_MUSICXML_FILE),
      contentType: 'application/vnd.recordare.musicxml+xml',
    },
    [MID_URL]: {
      body: readFixtureBytes(CHOIR_MIDI_FILE),
      contentType: 'audio/midi',
    },
  },
});
