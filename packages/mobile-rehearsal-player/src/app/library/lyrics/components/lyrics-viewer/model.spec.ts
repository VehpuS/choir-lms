import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SourceLyricsResolution } from '../../hooks/use-source-lyrics.js';
import {
  resolveLyricsPeekMaxHeight,
  shouldShowMiniPlayerLyrics,
} from './model.js';

const OWNER = { id: 'a', name: 'A.mp3' } as NonNullable<
  SourceLyricsResolution['owner']
>;

describe('shouldShowMiniPlayerLyrics', () => {
  it('shows the control only while the playing item has lyrics', () => {
    assert.equal(
      shouldShowMiniPlayerLyrics({
        lyrics: { text: 'x', updatedAt: 'now', origin: 'typed' },
        owner: OWNER,
      }),
      true,
    );
    assert.equal(
      shouldShowMiniPlayerLyrics({ lyrics: undefined, owner: OWNER }),
      false,
    );
    assert.equal(
      shouldShowMiniPlayerLyrics({ lyrics: undefined, owner: null }),
      false,
    );
  });
});

describe('resolveLyricsPeekMaxHeight', () => {
  it('is half the window height', () => {
    assert.equal(resolveLyricsPeekMaxHeight(800), 400);
  });
});
