/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const SOURCE_MAP_COMMENT_PATTERN = /\n?\/\/# sourceMappingURL=.*\s*$/;

const normalize = (source: string) =>
  source.replace(SOURCE_MAP_COMMENT_PATTERN, '').trimEnd();

describe('SoundTouch processor asset', () => {
  it('matches the installed @soundtouchjs/audio-worklet processor', () => {
    const packageProcessorPath = createRequire(import.meta.url).resolve(
      '@soundtouchjs/audio-worklet/processor',
    );
    const assetPath = new URL(
      '../../../../../assets/audio/soundtouch-processor.worklet',
      import.meta.url,
    );

    // The copy exists because the worklet loads by URL; after upgrading the
    // package, re-copy `.dist/soundtouch-processor.js` over the asset.
    assert.equal(
      normalize(readFileSync(assetPath, 'utf8')),
      normalize(readFileSync(packageProcessorPath, 'utf8')),
    );
  });
});
