/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  hasPlayableItemAudioChanged,
  hasPlayableItemChanged,
} from './saved-track-playback-view-model.js';

describe('playable item audio change', () => {
  it('does not treat a refreshed source length as a reason to reload the player', () => {
    const active = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: undefined,
    });
    const hydrated = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: 188_617,
    });

    // The item changed (the UI must update) but the audio did not.
    assert.equal(hasPlayableItemChanged(active, hydrated), true);
    assert.equal(hasPlayableItemAudioChanged(active, hydrated), false);
  });

  it('does not reload for a renamed loop or a moved queue position', () => {
    const loop = createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE);

    assert.equal(
      hasPlayableItemAudioChanged(loop, {
        ...loop,
        playlistEntryId: 'entry-2',
        title: 'Renamed',
      }),
      false,
    );
  });

  it('reloads when the loop range is edited', () => {
    const loop = createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE);

    assert.equal(
      hasPlayableItemAudioChanged(loop, {
        ...loop,
        range: { endMs: 24_000, startMs: 15_000 },
      }),
      true,
    );
  });

  it('reloads when the item points at a different Drive file', () => {
    const track = createTrackPlayableItem(PLAYABLE_SOURCE);
    const other = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      driveFileId: 'another-file',
      id: 'drive:another-file',
    });

    assert.equal(hasPlayableItemAudioChanged(track, other), true);
  });
});
