import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  type Playlist,
} from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import {
  formatFilesRowMeta,
  resolveFilesRowPlaybackPresentation,
  type FilesViewPlayback,
} from './files-row-playback-model';
import { LOOP, PLAYLIST, SOURCE } from './files-row-actions-test-helpers';

const TRACK_ROW: LibraryFilesRow = {
  fileLink: {
    entityId: SOURCE.id,
    entityKind: 'track',
    id: `file-link:track:${SOURCE.id}`,
    parentFolderId: 'folder:library-root',
  },
  isPlayable: true,
  kind: 'track',
  label: SOURCE.name,
  source: SOURCE,
  supportingLabel: '4:05',
};

const LOOP_ROW: LibraryFilesRow = {
  fileLink: {
    entityId: LOOP.id,
    entityKind: 'loop',
    id: `file-link:loop:${LOOP.id}`,
    parentFolderId: 'folder:library-root',
  },
  kind: 'loop',
  label: LOOP.name,
  loop: LOOP,
  playableItem: createLoopPlayableItem(LOOP, SOURCE),
  source: SOURCE,
  supportingLabel: `0:12–0:24 · 0:12 · ${SOURCE.name}`,
};

const PLAYLIST_WITH_ITEM: Playlist = {
  ...PLAYLIST,
  items: [
    {
      createdAt: PLAYLIST.createdAt,
      id: 'entry-1',
      kind: 'track',
      playlistId: PLAYLIST.id,
      sortIndex: 0,
      sourceId: SOURCE.id,
      title: SOURCE.name,
    },
  ],
};

const createPlaylistRow = (playlist: Playlist): LibraryFilesRow => {
  return {
    fileLink: {
      entityId: playlist.id,
      entityKind: 'playlist',
      id: `file-link:playlist:${playlist.id}`,
      parentFolderId: 'folder:library-root',
    },
    kind: 'playlist',
    label: playlist.name,
    playlist,
    supportingLabel: 'Playlist · 1 item',
  };
};

const FOLDER_ROW: LibraryFilesRow = {
  childCount: 0,
  folder: {
    createdAt: '2026-05-10T10:00:00.000Z',
    id: 'folder-warmups',
    name: 'Warmups',
    parentFolderId: 'folder:library-root',
  },
  kind: 'folder',
  label: 'Warmups',
  supportingLabel: '0 items',
};

const createPlayback = (
  overrides: Partial<FilesViewPlayback> = {},
): FilesViewPlayback & { calls: string[] } => {
  const calls: string[] = [];

  return {
    calls,
    isPreparing: false,
    onStartPlaylist: (playlist) => {
      calls.push(`start:${playlist.id}`);
    },
    onToggleActivePlayback: () => {
      calls.push('toggle-active');
    },
    state: undefined,
    ...overrides,
  };
};

describe('resolveFilesRowPlaybackPresentation', () => {
  it('gives an idle track a play ring that toggles it like the row tap', () => {
    const toggled: string[] = [];
    const presentation = resolveFilesRowPlaybackPresentation({
      activePlayableItem: null,
      isActive: false,
      onToggle: () => {
        toggled.push(TRACK_ROW.label);
      },
      playback: createPlayback(),
      row: TRACK_ROW,
    });

    assert.equal(presentation.leadingIconName, 'music-note-outline');
    assert.equal(presentation.isPlaying, false);
    assert.equal(presentation.playbackRing?.iconName, 'play');
    assert.equal(
      presentation.playbackRing?.accessibilityLabel,
      `Play ${SOURCE.name}`,
    );

    presentation.playbackRing?.onPress();

    assert.deepEqual(toggled, [SOURCE.name]);
  });

  it('keeps the playing track on its type glyph and shows a pause ring', () => {
    const presentation = resolveFilesRowPlaybackPresentation({
      activePlayableItem: createTrackPlayableItem(SOURCE),
      isActive: true,
      onToggle: () => undefined,
      playback: createPlayback({ state: 'playing' }),
      row: TRACK_ROW,
    });

    assert.equal(presentation.leadingIconName, 'music-note-outline');
    assert.equal(presentation.isActive, true);
    assert.equal(presentation.isPlaying, true);
    assert.equal(presentation.playbackRing?.iconName, 'pause');
    assert.equal(
      presentation.playbackRing?.accessibilityLabel,
      `Pause ${SOURCE.name}`,
    );
  });

  it('keeps the active loop marked but offers resume while paused', () => {
    const presentation = resolveFilesRowPlaybackPresentation({
      activePlayableItem: createLoopPlayableItem(LOOP, SOURCE),
      isActive: true,
      onToggle: () => undefined,
      playback: createPlayback({ state: 'paused' }),
      row: LOOP_ROW,
    });

    assert.equal(presentation.leadingIconName, 'repeat');
    assert.equal(presentation.isPlaying, false);
    assert.equal(presentation.playbackRing?.iconName, 'play');
    assert.equal(
      presentation.playbackRing?.accessibilityLabel,
      `Resume ${LOOP.name}`,
    );
  });

  it('starts an idle playlist from its ring instead of opening it', () => {
    const playback = createPlayback();
    const presentation = resolveFilesRowPlaybackPresentation({
      activePlayableItem: null,
      isActive: false,
      onToggle: () => {
        playback.calls.push('open');
      },
      playback,
      row: createPlaylistRow(PLAYLIST_WITH_ITEM),
    });

    presentation.playbackRing?.onPress();

    assert.equal(presentation.leadingIconName, 'playlist-music-outline');
    assert.deepEqual(playback.calls, [`start:${PLAYLIST.id}`]);
  });

  it('pauses the active playlist in place rather than restarting it', () => {
    const playback = createPlayback({ state: 'playing' });
    const presentation = resolveFilesRowPlaybackPresentation({
      activePlayableItem: {
        ...createTrackPlayableItem(SOURCE),
        playlistId: PLAYLIST.id,
      },
      isActive: true,
      onToggle: () => undefined,
      playback,
      row: createPlaylistRow(PLAYLIST_WITH_ITEM),
    });

    presentation.playbackRing?.onPress();

    assert.equal(presentation.isPlaying, true);
    assert.equal(presentation.playbackRing?.iconName, 'pause');
    assert.deepEqual(playback.calls, ['toggle-active']);
  });

  it('disables the ring on an empty playlist', () => {
    const presentation = resolveFilesRowPlaybackPresentation({
      activePlayableItem: null,
      isActive: false,
      onToggle: () => undefined,
      playback: createPlayback(),
      row: createPlaylistRow(PLAYLIST),
    });

    assert.equal(presentation.playbackRing?.disabled, true);
  });

  it('gives folders and unplayable tracks no ring', () => {
    const folder = resolveFilesRowPlaybackPresentation({
      activePlayableItem: null,
      isActive: false,
      onToggle: () => undefined,
      playback: createPlayback(),
      row: FOLDER_ROW,
    });
    const unplayableTrack = resolveFilesRowPlaybackPresentation({
      activePlayableItem: null,
      isActive: false,
      onToggle: () => undefined,
      playback: createPlayback(),
      row: { ...TRACK_ROW, isPlayable: false },
    });

    assert.equal(folder.leadingIconName, 'folder-outline');
    assert.equal(folder.playbackRing, undefined);
    assert.equal(unplayableTrack.playbackRing, undefined);
  });
});

describe('formatFilesRowMeta', () => {
  it('prefixes the meta line with Playing only while the row plays', () => {
    assert.equal(
      formatFilesRowMeta({
        isPlaying: true,
        supportingLabel: '4:38 · 3 loops',
      }),
      'Playing · 4:38 · 3 loops',
    );
    assert.equal(
      formatFilesRowMeta({ isPlaying: false, supportingLabel: '4:38' }),
      '4:38',
    );
  });
});
