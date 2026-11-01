import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = join(here, '../../..');

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    return /\.tsx?$/.test(name) && !/\.spec\.tsx?$/.test(name) ? [path] : [];
  });

// The block stream is the only way to receive contiguous raw samples, so
// who subscribes to it decides who can store audio. The microphone plumbing
// that defines and delivers it is the other allowed place.
const BLOCK_PLUMBING = [
  'app/library/pitch/pcm-source-types.ts',
  'app/library/pitch/shared-pcm-source.ts',
  'app/library/pitch/pcm-source.web.ts',
  'app/library/pitch/pitch-test-support.ts',
];
const RECORDING_FOLDER = 'app/library/recording/';

describe('only the recording code writes audio samples', () => {
  const files = sourceFiles(appSource).map((path) => ({
    path: relative(appSource, path),
    text: readFileSync(path, 'utf8'),
  }));

  it('subscribes to the raw block stream nowhere but the recorder', () => {
    const offenders = files
      .filter(({ text }) => /\bonBlock\b/.test(text))
      .map(({ path }) => path)
      .filter(
        (path) =>
          !path.startsWith(RECORDING_FOLDER) && !BLOCK_PLUMBING.includes(path),
      );

    assert.deepEqual(offenders, []);
  });

  it('keeps recording code out of the pitch folder and pitch detection', () => {
    const importsRecording = files.filter(
      ({ path, text }) =>
        path.startsWith('app/library/pitch/') &&
        /library\/recording|\.\.\/recording\//.test(text),
    );

    assert.deepEqual(
      importsRecording.map(({ path }) => path),
      [],
    );
  });
});
