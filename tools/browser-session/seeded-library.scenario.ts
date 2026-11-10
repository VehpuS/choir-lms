import {
  buildMockComposite,
  buildMockLoop,
  buildMockLyrics,
  buildMockMarker,
  buildMockRecording,
  withMockPlaylistItems,
  withMockTags,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPlaylist,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// Proves the fixture builders end to end: a library seeded with a loop, a
// playlist with entries, tags, markers, lyrics, a composite and a recording
// shows each of them in the app.
const alto = withMockTags(
  buildMockSource('Alto Part', {
    lyrics: buildMockLyrics('Kyrie eleison'),
    markers: [buildMockMarker('Verse', 12_000)],
  }),
  ['Mass'],
);
const tenor = buildMockSource('Tenor Part');
const loop = buildMockLoop(alto, 'Tricky bars');

void runScenario({
  library: {
    composites: [
      buildMockComposite('Kyrie mix', [
        { source: alto, name: 'Alto' },
        { source: tenor, name: 'Tenor' },
      ]),
    ],
    loops: [loop],
    playlists: [
      withMockPlaylistItems(buildMockPlaylist('Warmups'), [
        { source: alto },
        { loop, source: alto },
      ]),
    ],
    sources: [alto, tenor],
  },
  recordings: [buildMockRecording(alto)],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');

    for (const [chip, expected] of [
      ['Loops', 'Tricky bars'],
      ['Playlists', 'Warmups'],
      ['Composites', 'Kyrie mix'],
      ['Recordings', 'Recording 1'],
      ['Tags', 'Mass'],
    ] as const) {
      await page.getByText(chip, { exact: true }).first().click();
      await page.getByText(expected).first().waitFor({ timeout: 5000 });
      await shot(`seeded-${chip.toLowerCase()}`);
      pass(`${chip} shows ${expected}`);
    }
  },
});
