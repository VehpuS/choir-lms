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
} from '../../test-utils/library-test-fixtures.js';
import { resolveLoopPreviewPlaybackTimeline } from '../utils/saved-loop-preview-playback-view-model.js';
import { resolveSavedLoopRowActions } from '../utils/saved-loop-row-actions.js';
import {
  buildNamedLoop,
  createLoopBuilderDraft,
  createLoopPreviewPlayableItem,
  getDefaultLoopName,
  getSavedLoopItemIssue,
  getSavedLoopRemovalCopy,
  getSavedLoopsStatusCopy,
  hydrateLoopBuilderTrackDuration,
  resolveLoopBuilderRangeSelection,
  resolveLoopBuilderTrack,
  resolveLoopBuilderTrackDuration,
  resolveSavedLoopCards,
  resolveSourcesMissingLoopBuilderDuration,
  updateLoopBuilderDraftRange,
} from '../utils/saved-loop-view-model.js';
import { buildPlaylistPlaybackSession } from '../utils/saved-playlist-playback-view-model.js';
import {
  buildTrackScopedLoopPlaybackPlaylist,
  getTrackScopedLoopDetailCopy,
} from '../utils/track-scoped-loop-view-model.js';

describe('saved loop view-model', () => {
  it('prefills loop drafts with a source-aware suggested name', () => {
    assert.equal(
      getDefaultLoopName({
        endMs: 18500,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
      }),
      'Loop 0:12 - 0:18 • Alto Line.mp3',
    );

    assert.deepEqual(
      createLoopBuilderDraft({
        endMs: 18500,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
      }),
      {
        endMs: 18500,
        loopName: 'Loop 0:12 - 0:18 • Alto Line.mp3',
        startMs: 12000,
        suggestedLoopName: 'Loop 0:12 - 0:18 • Alto Line.mp3',
      },
    );
  });

  it('keeps following the suggested loop name until the user overrides it', () => {
    const initialDraft = createLoopBuilderDraft({
      endMs: 18500,
      sourceName: PLAYABLE_SOURCE.name,
      startMs: 12000,
    });

    assert.deepEqual(
      updateLoopBuilderDraftRange({
        draft: initialDraft,
        endMs: 47000,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 30000,
      }),
      {
        endMs: 47000,
        loopName: 'Loop 0:30 - 0:47 • Alto Line.mp3',
        startMs: 30000,
        suggestedLoopName: 'Loop 0:30 - 0:47 • Alto Line.mp3',
      },
    );

    assert.deepEqual(
      updateLoopBuilderDraftRange({
        draft: {
          ...initialDraft,
          loopName: 'Entrance cue',
        },
        endMs: 47000,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 30000,
      }),
      {
        endMs: 47000,
        loopName: 'Entrance cue',
        startMs: 30000,
        suggestedLoopName: 'Loop 0:30 - 0:47 • Alto Line.mp3',
      },
    );
  });

  it('derives preview timeline progress and scrub availability from active preview playback', () => {
    const previewPlayableItem = createLoopPreviewPlayableItem({
      endMs: 18500,
      selectedTrack: createTrackPlayableItem(PLAYABLE_SOURCE),
      startMs: 12000,
    });

    assert.deepEqual(
      resolveLoopPreviewPlaybackTimeline({
        activePlayableItem: previewPlayableItem,
        playbackPositionSeconds: 14,
        previewPlayableItem,
      }),
      {
        canScrub: true,
        elapsedSeconds: 2,
        positionSeconds: 14,
        progressRatio: 2 / 6.5,
        totalDurationSeconds: 6.5,
      },
    );

    assert.deepEqual(
      resolveLoopPreviewPlaybackTimeline({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackPositionSeconds: 40,
        previewPlayableItem,
      }),
      {
        canScrub: false,
        elapsedSeconds: 0,
        positionSeconds: 12,
        progressRatio: 0,
        totalDurationSeconds: 6.5,
      },
    );
  });

  it('builds named loops from saved-track markers and resolves them for playback', () => {
    const result = buildNamedLoop({
      createId: () => 'loop-1',
      endMs: 18500,
      loopName: '  Entrance cue  ',
      now: '2026-05-10T00:00:00.000Z',
      ownerId: 'user-1',
      source: PLAYABLE_SOURCE,
      startMs: 12000,
    });

    assert.equal(result.issue, null);
    assert.deepEqual(result.loop, SAVED_LOOP);

    const [loopCard] = resolveSavedLoopCards([SAVED_LOOP], [PLAYABLE_SOURCE]);

    assert.equal(loopCard?.metadataLabel, 'Alto Line.mp3 • 0:12 to 0:18');
    assert.deepEqual(loopCard?.parentTrack, {
      id: PLAYABLE_SOURCE.id,
      name: PLAYABLE_SOURCE.name,
    });
    assert.equal(loopCard?.playableItem?.id, 'loop:loop-1');
    assert.equal(loopCard?.rangeLabel, '0:12 to 0:18');
    assert.equal(loopCard?.message, undefined);
  });

  it('builds a stable track-scoped loop playback playlist and detail copy', () => {
    const secondLoop = {
      ...SAVED_LOOP,
      id: 'loop-2',
      name: 'Cadence repeat',
      startMs: 30000,
      endMs: 47000,
      createdAt: '2026-05-10T01:00:00.000Z',
      updatedAt: '2026-05-10T01:05:00.000Z',
    };
    const playlist = buildTrackScopedLoopPlaybackPlaylist({
      loops: [SAVED_LOOP, secondLoop],
      source: PLAYABLE_SOURCE,
    });

    assert.deepEqual(
      getTrackScopedLoopDetailCopy({
        loopCount: 2,
        sourceName: PLAYABLE_SOURCE.name,
      }),
      {
        body: "Play this track's saved loops in order, start from any loop row, or capture a new loop from Alto Line.mp3.",
        emptyMessage:
          'No saved loops for Alto Line.mp3 yet. Make new loop to capture the first practice segment.',
        metadataLabel: '2 saved loops • Parent track',
        title: 'Alto Line.mp3 loops',
      },
    );

    assert.deepEqual(playlist, {
      id: 'playlist:track-loops:drive:alto-line',
      name: 'Alto Line.mp3 loops',
      items: [
        {
          id: 'entry:loop:loop-1:2026-05-10T00:00:00.000Z',
          playlistId: 'playlist:track-loops:drive:alto-line',
          sortIndex: 0,
          kind: 'loop',
          sourceId: 'drive:alto-line',
          loopId: 'loop-1',
          title: 'Entrance cue',
          description: 'Alto Line.mp3 loop',
          createdAt: '2026-05-10T00:00:00.000Z',
        },
        {
          id: 'entry:loop:loop-2:2026-05-10T01:00:00.000Z',
          playlistId: 'playlist:track-loops:drive:alto-line',
          sortIndex: 1,
          kind: 'loop',
          sourceId: 'drive:alto-line',
          loopId: 'loop-2',
          title: 'Cadence repeat',
          description: 'Alto Line.mp3 loop',
          createdAt: '2026-05-10T01:00:00.000Z',
        },
      ],
      ownershipScope: 'user',
      ownerId: 'drive:alto-line',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T01:05:00.000Z',
    });

    const playbackSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP, secondLoop],
      mode: 'ordered',
      playlist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
      startEntryId: playlist.items[1]?.id,
    });

    assert.equal(playbackSession.issue, null);
    assert.equal(playbackSession.session?.currentIndex, 1);
    assert.deepEqual(
      playbackSession.session?.queue.items.map((item) => ({
        id: item.id,
        loopId: item.loopId,
        playlistEntryId: item.playlistEntryId,
      })),
      [
        {
          id: 'loop:loop-1',
          loopId: 'loop-1',
          playlistEntryId: 'entry:loop:loop-1:2026-05-10T00:00:00.000Z',
        },
        {
          id: 'loop:loop-2',
          loopId: 'loop-2',
          playlistEntryId: 'entry:loop:loop-2:2026-05-10T01:00:00.000Z',
        },
      ],
    );
  });

  it('keeps loop playback inline and routes secondary actions through overflow', () => {
    const actions = resolveSavedLoopRowActions({
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: true,
      hasPlayableItem: true,
      itemName: SAVED_LOOP.name,
      isLoopActive: false,
      isLoopMutating: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: {
        disabled: false,
        label: 'Play',
      },
    });

    assert.deepEqual(
      actions.map((action) => ({
        accessibilityLabel: action.accessibilityLabel,
        disabled: action.disabled ?? false,
        iconName: action.iconName,
        label: action.label,
        placement: action.placement,
        tone: action.tone,
      })),
      [
        {
          accessibilityLabel: 'Play Entrance cue',
          disabled: false,
          iconName: 'play',
          label: 'Play',
          placement: 'inline',
          tone: 'primary',
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Play next',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Add to queue',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Add to playlist',
          placement: 'menu',
          tone: 'primary',
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Remove',
          placement: 'menu',
          tone: 'destructive',
        },
      ],
    );
  });

  it('omits loop queue actions when playback queueing is unavailable', () => {
    const actions = resolveSavedLoopRowActions({
      canMutateLoops: true,
      canMutatePlaylists: false,
      canQueueAsNext: false,
      hasPlayableItem: false,
      itemName: SAVED_LOOP.name,
      isLoopActive: true,
      isLoopMutating: true,
      isPendingRemoval: true,
      isPlaylistMutating: false,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: {
        disabled: true,
        label: 'Unavailable',
      },
    });

    assert.deepEqual(
      actions.map((action) => ({
        accessibilityLabel: action.accessibilityLabel,
        disabled: action.disabled ?? false,
        iconName: action.iconName,
        label: action.label,
        placement: action.placement,
      })),
      [
        {
          accessibilityLabel: 'Unavailable Entrance cue',
          disabled: true,
          iconName: 'play',
          label: 'Unavailable',
          placement: 'inline',
        },
        {
          accessibilityLabel: undefined,
          disabled: true,
          iconName: undefined,
          label: 'Playlists unavailable',
          placement: 'menu',
        },
        {
          accessibilityLabel: undefined,
          disabled: true,
          iconName: undefined,
          label: 'Removing…',
          placement: 'menu',
        },
      ],
    );
  });

  it('lets the loop builder follow an explicitly selected saved track', () => {
    const selectedTrack = resolveLoopBuilderTrack({
      savedSources: [PLAYABLE_SOURCE],
      selectedSourceId: PLAYABLE_SOURCE.id,
    });

    assert.deepEqual(selectedTrack, createTrackPlayableItem(PLAYABLE_SOURCE));
  });

  it('requires an explicit saved track selection before opening the loop builder', () => {
    assert.equal(
      resolveLoopBuilderTrack({
        savedSources: [PLAYABLE_SOURCE],
        selectedSourceId: null,
      }),
      null,
    );
  });

  it('normalizes dual-thumb slider values into an ordered, bounded loop range', () => {
    assert.deepEqual(
      resolveLoopBuilderRangeSelection({
        durationMs: 18000,
        sliderValue: [15, 24],
      }),
      {
        startMs: 15000,
        endMs: 18000,
      },
    );

    assert.deepEqual(
      resolveLoopBuilderRangeSelection({
        durationMs: 18000,
        sliderValue: [12, 4],
      }),
      {
        startMs: 4000,
        endMs: 12000,
      },
    );
  });

  it('creates a preview playable item from the draft loop range', () => {
    const previewPlayableItem = createLoopPreviewPlayableItem({
      endMs: 18500,
      selectedTrack: createTrackPlayableItem(PLAYABLE_SOURCE),
      startMs: 12000,
    });

    assert.equal(previewPlayableItem.kind, 'loop');
    assert.equal(
      previewPlayableItem.id,
      `loop-preview:${PLAYABLE_SOURCE.id}:12000:18500`,
    );
    assert.deepEqual(previewPlayableItem.range, {
      startMs: 12000,
      endMs: 18500,
    });
  });

  it('hydrates a selected loop-builder track with a fetched duration', () => {
    const selectedTrack = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: undefined,
    });
    const hydratedTrack = hydrateLoopBuilderTrackDuration(selectedTrack, 93000);

    assert.equal(hydratedTrack?.source.durationMs, 93000);
    assert.equal(hydratedTrack?.range.endMs, 93000);
  });

  it('uses active playback duration when Drive metadata is still missing', () => {
    const selectedTrack = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: undefined,
    });

    assert.equal(
      resolveLoopBuilderTrackDuration({
        activePlayableItem: selectedTrack,
        playbackDurationSeconds: 93,
        resolvedDurationMs: null,
        selectedTrack,
      }),
      93000,
    );

    assert.equal(
      resolveLoopBuilderTrackDuration({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        playbackDurationSeconds: 93,
        resolvedDurationMs: null,
        selectedTrack,
      }),
      null,
    );
  });

  it('finds saved tracks that still need a duration refresh', () => {
    const sourcesMissingDuration = resolveSourcesMissingLoopBuilderDuration({
      resolvedDurationsBySourceId: {
        'drive:missing-retry': null,
        [PLAYABLE_SOURCE.id]: 93000,
      },
      savedSources: [
        PLAYABLE_SOURCE,
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:missing-duration',
          driveFileId: 'missing-duration',
          durationMs: undefined,
        },
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:missing-retry',
          driveFileId: 'missing-retry',
          durationMs: undefined,
        },
      ],
    });

    assert.deepEqual(sourcesMissingDuration, [
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:missing-duration',
        driveFileId: 'missing-duration',
        durationMs: undefined,
      },
    ]);

    assert.deepEqual(
      resolveSourcesMissingLoopBuilderDuration({
        resolvedDurationsBySourceId: {
          'drive:missing-retry': null,
        },
        retryFailedLookup: true,
        savedSources: [
          {
            ...PLAYABLE_SOURCE,
            id: 'drive:missing-retry',
            driveFileId: 'missing-retry',
            durationMs: undefined,
          },
        ],
      }),
      [
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:missing-retry',
          driveFileId: 'missing-retry',
          durationMs: undefined,
        },
      ],
    );
  });

  it('rejects invalid loop saves and warns when saved loops lose their source', () => {
    const invalidRangeResult = buildNamedLoop({
      endMs: 12000,
      loopName: 'Verse repeat',
      ownerId: 'user-1',
      source: PLAYABLE_SOURCE,
      startMs: 12000,
    });

    assert.deepEqual(invalidRangeResult, {
      issue: {
        title: 'Invalid loop range',
        message: 'Loop end must be after the loop start.',
      },
      loop: null,
    });

    const [missingSourceLoopCard] = resolveSavedLoopCards([SAVED_LOOP], []);

    assert.deepEqual(missingSourceLoopCard?.parentTrack, {
      id: SAVED_LOOP.sourceId,
      name: SAVED_LOOP.sourceName,
    });
    assert.equal(missingSourceLoopCard?.playableItem, null);
    assert.equal(missingSourceLoopCard?.rangeLabel, '0:12 to 0:18');
    assert.match(
      missingSourceLoopCard?.message ?? '',
      /Restore the saved source track/,
    );

    const copy = getSavedLoopsStatusCopy({
      isLoading: false,
      issue: null,
      savedLoopCount: 1,
      unresolvedLoopCount: 1,
    });

    assert.equal(copy.tone, 'warning');
    assert.equal(copy.title, 'Saved loops need attention');
  });

  it('builds destructive copy and maps delete failures to the affected loop', () => {
    assert.deepEqual(getSavedLoopRemovalCopy(SAVED_LOOP), {
      confirmLabel: 'Remove loop',
      message:
        '"Entrance cue" (Alto Line.mp3 • 0:12 to 0:18) will be removed from your saved practice loops.',
      title: 'Remove saved loop?',
    });

    assert.equal(
      getSavedLoopItemIssue(
        {
          kind: 'delete',
          loopId: SAVED_LOOP.id,
          title: 'Could not remove loop',
          message:
            'The rehearsal library could not remove the loop "Entrance cue".',
        },
        SAVED_LOOP.id,
      ),
      'The rehearsal library could not remove the loop "Entrance cue".',
    );
    assert.equal(
      getSavedLoopItemIssue(
        {
          kind: 'delete',
          loopId: SAVED_LOOP.id,
          title: 'Could not remove loop',
          message:
            'The rehearsal library could not remove the loop "Entrance cue".',
        },
        'missing-loop',
      ),
      undefined,
    );
  });
});
