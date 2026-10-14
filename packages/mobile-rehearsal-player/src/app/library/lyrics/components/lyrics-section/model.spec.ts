import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SourceLyricsResolution } from '../../hooks/use-source-lyrics.js';
import {
  MIN_WINDOW_HEIGHT_FOR_INLINE_LYRICS,
  resolveLyricsSectionModel,
  shouldShowInlineLyrics,
} from './model.js';

const OWNER = {
  id: 'drive:kyrie',
  name: 'Kyrie.mp3',
} as NonNullable<SourceLyricsResolution['owner']>;
const LYRICS = {
  text: 'Kyrie eleison',
  updatedAt: 'now',
  origin: 'typed',
} as const;

describe('resolveLyricsSectionModel', () => {
  it('shows the lyrics of a playing track without a shared note', () => {
    assert.deepEqual(
      resolveLyricsSectionModel(
        { kind: 'track', sourceId: OWNER.id },
        { lyrics: LYRICS, owner: OWNER },
      ),
      {
        kind: 'filled',
        ownerName: 'Kyrie.mp3',
        sharedFromName: null,
        text: 'Kyrie eleison',
      },
    );
  });

  it('names the owning track for a loop and for an adjusted track', () => {
    const loop = resolveLyricsSectionModel(
      { kind: 'loop', sourceId: OWNER.id },
      { lyrics: LYRICS, owner: OWNER },
    );
    const adjusted = resolveLyricsSectionModel(
      { kind: 'track', sourceId: 'adjusted:kyrie' },
      { lyrics: LYRICS, owner: OWNER },
    );

    assert.equal(loop.kind === 'filled' && loop.sharedFromName, 'Kyrie.mp3');
    assert.equal(
      adjusted.kind === 'filled' && adjusted.sharedFromName,
      'Kyrie.mp3',
    );
  });

  it('offers adding lyrics when the owner has none', () => {
    assert.deepEqual(
      resolveLyricsSectionModel(
        { kind: 'track', sourceId: OWNER.id },
        { lyrics: undefined, owner: OWNER },
      ),
      { kind: 'empty', ownerName: 'Kyrie.mp3' },
    );
  });

  it('hides the section when the owning track no longer exists', () => {
    assert.deepEqual(
      resolveLyricsSectionModel(
        { kind: 'loop', sourceId: 'gone' },
        { lyrics: undefined, owner: null },
      ),
      { kind: 'hidden' },
    );
  });
});

describe('shouldShowInlineLyrics', () => {
  it('shows the scrolling lyrics only when the screen is tall enough', () => {
    assert.equal(
      shouldShowInlineLyrics(MIN_WINDOW_HEIGHT_FOR_INLINE_LYRICS),
      true,
    );
    assert.equal(
      shouldShowInlineLyrics(MIN_WINDOW_HEIGHT_FOR_INLINE_LYRICS - 1),
      false,
    );
    assert.equal(shouldShowInlineLyrics(667), false);
  });
});
