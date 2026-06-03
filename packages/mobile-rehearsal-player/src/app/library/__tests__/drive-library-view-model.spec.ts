/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import {
  AUTHORIZED_STATE,
  BROWSE_SNAPSHOT,
  PLAYABLE_SOURCE,
  SEARCH_SNAPSHOT,
  UNSUPPORTED_SOURCE,
} from '../../test-utils/library-test-fixtures.js';
import './saved-loop-view-model.spec.js';
import './saved-rehearsal-library-view-model.spec.js';
import './saved-track-playback-view-model.spec.js';

import {
  getDriveLibraryStatusCopy,
  getDriveSearchContextCopy,
  getFolderMetadataLabels,
  getLibrarySearchContextCopy,
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from '../utils/drive-library-view-model.js';
import { resolveDriveSourceActions } from '../utils/drive-search-preview-actions.js';
import {
  filterSavedLibrarySourcesByQuery as filterSavedLibrarySourcesByLibraryQuery,
  filterSavedLoopsByQuery as filterSavedLoopsByLibraryQuery,
  filterSavedPlaylistsByQuery as filterSavedPlaylistsByLibraryQuery,
  resolveActiveLibrarySearchQuery as resolveActiveLibraryQuery,
  resolveSearchHighlightParts,
} from '../utils/saved-library-search-view-model.js';
import {
  normalizeRecentSearchTerm,
  recordRecentSearchTerm,
} from '../utils/search-history.js';
import {
  ADD_SCREEN_PANEL_ORDER,
  DRIVE_DISCOVERY_NAVIGATION_ORDER,
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from '../utils/add-drive-layout.js';
import {
  COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING,
  getCompactPlayableRowShellLayout,
} from '../../components/compact-playable-row-shell-model.js';

describe('getDriveLibraryStatusCopy', () => {
  it('summarizes the browse surface with folders and playable items', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: null,
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      searchSnapshot: {
        query: '',
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'ready');
    assert.equal(copy.title, 'Drive browser ready');
    assert.equal(
      copy.message,
      '1 folder, 1 playable track, and 1 item needs attention are available in My Drive.',
    );
  });

  it('asks the user to reconnect when Drive access has expired', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'expired',
      },
      activeSearchQuery: null,
      browseSnapshot: {
        ...BROWSE_SNAPSHOT,
        folders: [],
        playableSources: [],
        unavailableSources: [],
      },
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      searchSnapshot: {
        query: '',
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'warning');
    assert.equal(copy.title, 'Drive access expired');
    assert.match(copy.message, /Reconnect Google Drive/);
  });

  it('surfaces authorization-sensitive refresh failures', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: null,
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue: 'Drive library request failed with 403',
      searchSnapshot: SEARCH_SNAPSHOT,
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Drive discovery failed');
    assert.equal(
      copy.message,
      'Drive access needs attention before the rehearsal library can refresh.',
    );
  });

  it('shows detailed Drive API configuration errors when available', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Kyrie',
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue:
        'Drive library request failed with 403: Google Drive API has not been used in project 123456 before or it is disabled.',
      searchSnapshot: SEARCH_SNAPSHOT,
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Drive discovery failed');
    assert.equal(
      copy.message,
      'Google Drive API has not been used in project 123456 before or it is disabled.',
    );
  });

  it('summarizes active search results across Drive sources', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Kyrie',
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      searchSnapshot: SEARCH_SNAPSHOT,
    });

    assert.equal(copy.tone, 'ready');
    assert.equal(copy.title, 'Search results ready');
    assert.equal(
      copy.message,
      '1 matching track found, plus 1 item needs attention.',
    );
  });

  it('uses folder-scoped copy while Drive search is loading', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Roxanne',
      browseSnapshot: BROWSE_SNAPSHOT,
      currentSearchLocation: {
        id: 'folder-archive',
        kind: 'folder',
        name: 'Music Archive',
        rootKind: 'my-drive',
      },
      googleAuthConfigured: true,
      isLoading: true,
      issue: null,
      searchSnapshot: {
        query: 'Roxanne',
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'neutral');
    assert.equal(copy.title, 'Searching Google Drive');
    assert.equal(
      copy.message,
      'Looking for matching audio in Music Archive and nested folders.',
    );
  });
});

describe('presentation helpers', () => {
  it('formats metadata and source state labels for library cards', () => {
    assert.deepEqual(getSourceMetadataLabels(PLAYABLE_SOURCE), [
      'MP3',
      '3:05',
      'Updated 2026-05-10',
    ]);
    assert.deepEqual(
      getSourceMetadataLabels(SEARCH_SNAPSHOT.playableSources[0]),
      ['MP3', '3:05', 'Updated 2026-05-10', 'Shared with you'],
    );
    assert.equal(getSourceAvailabilityLabel(PLAYABLE_SOURCE), 'Playable');
    assert.equal(getSourceStatusMessage(PLAYABLE_SOURCE), undefined);
    assert.equal(
      getSourceAvailabilityLabel(UNSUPPORTED_SOURCE),
      'Unsupported format',
    );
    assert.equal(
      getSourceStatusMessage(UNSUPPORTED_SOURCE),
      'This Drive file format is outside the MVP audio set.',
    );
  });

  it('formats folder metadata labels for the Drive browser', () => {
    assert.deepEqual(getFolderMetadataLabels(BROWSE_SNAPSHOT.folders[0]), [
      'Folder',
      'Updated 2026-05-10',
    ]);
  });
});

describe('resolveDriveSourceActions', () => {
  it('returns separate preview playback and save actions for unsaved Drive search rows', () => {
    const actions = resolveDriveSourceActions({
      activePlayableItem: null,
      canMutateLibrary: true,
      isLibraryLoading: false,
      isLibraryMutating: false,
      isPreparingPlayback: false,
      isSaved: false,
      isSavePending: false,
      onPreviewPlayback: () => undefined,
      onRemoveSource: () => undefined,
      onSaveSource: () => undefined,
      playbackState: undefined,
      source: PLAYABLE_SOURCE,
    });

    assert.equal(actions.length, 2);
    assert.deepEqual(actions[0], {
      accessibilityLabel: 'Play Alto Line.mp3',
      disabled: false,
      iconName: 'play',
      label: 'Play',
      onPress: actions[0]?.onPress,
      placement: 'inline',
      tone: 'primary',
    });
    assert.deepEqual(actions[1], {
      disabled: false,
      label: 'Save',
      onPress: actions[1]?.onPress,
      placement: 'inline',
    });
  });

  it('maps playback and save state labels for active and saved Drive search rows', () => {
    const actions = resolveDriveSourceActions({
      activePlayableItem: {
        description: 'Full track',
        id: 'track:drive:alto-line',
        kind: 'track',
        playlistEntryId: undefined,
        playlistId: undefined,
        range: {
          endMs: 185000,
          startMs: 0,
        },
        source: PLAYABLE_SOURCE,
        sourceId: PLAYABLE_SOURCE.id,
        title: PLAYABLE_SOURCE.name,
      },
      canMutateLibrary: true,
      isLibraryLoading: false,
      isLibraryMutating: false,
      isPreparingPlayback: false,
      isSaved: true,
      isSavePending: true,
      onPreviewPlayback: () => undefined,
      onRemoveSource: () => undefined,
      onSaveSource: () => undefined,
      playbackState: 'playing',
      source: PLAYABLE_SOURCE,
    });

    assert.equal(actions[0]?.label, 'Pause');
    assert.equal(actions[0]?.iconName, 'pause');
    assert.equal(actions[1]?.label, 'Removing…');
  });
});

describe('saved library search helpers', () => {
  it('normalizes an active library search query from user input', () => {
    assert.equal(resolveActiveLibraryQuery('  Kyrie  '), 'Kyrie');
    assert.equal(resolveActiveLibraryQuery('   '), null);
  });

  it('filters saved entities by the active library query', () => {
    const sources = [
      PLAYABLE_SOURCE,
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:bass-line',
        name: 'Bass Line.mp3',
      },
    ];
    const loops = [
      {
        createdAt: '2026-05-12T00:00:00.000Z',
        endMs: 18000,
        id: 'loop-1',
        name: 'Entrance cue',
        ownerId: 'user-1',
        ownershipScope: 'user' as const,
        sourceId: PLAYABLE_SOURCE.id,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
      {
        createdAt: '2026-05-12T00:00:00.000Z',
        endMs: 47000,
        id: 'loop-2',
        name: 'Bass cadence',
        ownerId: 'user-1',
        ownershipScope: 'user' as const,
        sourceId: 'drive:bass-line',
        sourceName: 'Bass Line.mp3',
        startMs: 35000,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
    ];
    const playlists = [
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Kyrie Warmups',
        ownerId: 'user-1',
      }),
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Bass Focus',
        ownerId: 'user-1',
      }),
    ];

    assert.deepEqual(
      filterSavedLibrarySourcesByLibraryQuery({
        activeSearchQuery: 'bass',
        sources,
      }).map((source) => source.name),
      ['Bass Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByLibraryQuery({
        activeSearchQuery: 'bass',
        loops,
      }).map((loop) => loop.name),
      ['Bass cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByLibraryQuery({
        activeSearchQuery: 'kyrie',
        playlists,
      }).map((playlist) => playlist.name),
      ['Kyrie Warmups'],
    );
  });

  it('returns highlight fragments for repeated case-insensitive matches', () => {
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'ky',
        text: 'Kyrie Kyrie',
      }),
      [
        {
          isHighlighted: true,
          text: 'Ky',
        },
        {
          isHighlighted: false,
          text: 'rie ',
        },
        {
          isHighlighted: true,
          text: 'Ky',
        },
        {
          isHighlighted: false,
          text: 'rie',
        },
      ],
    );
  });

  it('highlights loop metadata only when the visible source label matches the active query', () => {
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'alto',
        text: 'Alto Line.mp3 • 0:12 to 0:18',
      }),
      [
        {
          isHighlighted: true,
          text: 'Alto',
        },
        {
          isHighlighted: false,
          text: ' Line.mp3 • 0:12 to 0:18',
        },
      ],
    );
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'alto',
        text: 'Bass Line.mp3 • 0:12 to 0:18',
      }),
      [
        {
          isHighlighted: false,
          text: 'Bass Line.mp3 • 0:12 to 0:18',
        },
      ],
    );
  });
});

describe('search context copy helpers', () => {
  it('shows My Drive scoped search copy at root', () => {
    assert.deepEqual(getDriveSearchContextCopy(BROWSE_SNAPSHOT.location), {
      helper: 'Search in My Drive',
      placeholder: 'Search in My Drive',
    });
  });

  it('shows folder-scoped search copy after drill-down', () => {
    assert.deepEqual(
      getDriveSearchContextCopy({
        id: 'folder-1',
        kind: 'folder',
        name: 'Sectionals',
        rootKind: 'my-drive',
      }),
      {
        helper: 'Search in Sectionals',
        placeholder: 'Search in Sectionals',
      },
    );
  });

  it('adds bracketed corpus detail in library search copy', () => {
    assert.deepEqual(getLibrarySearchContextCopy(), {
      helper: 'Search saved library (playlists, tracks, and loops)',
      placeholder: 'Search saved library',
    });
  });
});

describe('recent search helpers', () => {
  it('normalizes recent search terms before recording them', () => {
    assert.equal(normalizeRecentSearchTerm('  Kyrie  '), 'Kyrie');
    assert.equal(normalizeRecentSearchTerm('   '), null);
  });

  it('promotes recent search terms to the front without duplicates', () => {
    assert.deepEqual(
      recordRecentSearchTerm(
        ['Bass Focus', 'Kyrie Warmups', 'Entrance cue'],
        ' kyrie warmups ',
      ),
      ['kyrie warmups', 'Bass Focus', 'Entrance cue'],
    );
  });

  it('caps the stored recent search list to five entries', () => {
    assert.deepEqual(
      recordRecentSearchTerm(['One', 'Two', 'Three', 'Four', 'Five'], 'Six'),
      ['Six', 'One', 'Two', 'Three', 'Four'],
    );
  });
});

describe('Add surface layout contract', () => {
  it('keeps Add focused on a single discovery surface', () => {
    assert.deepEqual(ADD_SCREEN_PANEL_ORDER, ['discovery']);
  });

  it('keeps search controls directly below breadcrumbs in discovery', () => {
    assert.deepEqual(DRIVE_DISCOVERY_NAVIGATION_ORDER, [
      'root-selector',
      'breadcrumbs',
      'search-control',
    ]);
  });

  it('keeps status-card visibility tied to loading and non-ready states', () => {
    assert.equal(shouldShowDriveStatusCard(false, 'ready'), false);
    assert.equal(shouldShowDriveStatusCard(true, 'ready'), true);
    assert.equal(shouldShowDriveStatusCard(false, 'warning'), true);
  });

  it('keeps unavailable groups visible only when unavailable sources exist', () => {
    assert.equal(shouldShowUnavailableSources(0), false);
    assert.equal(shouldShowUnavailableSources(1), true);
  });
});

describe('compact playable row shell layout', () => {
  it('keeps card overflow top-right and reserves title space when present', () => {
    assert.deepEqual(
      getCompactPlayableRowShellLayout({
        hasOverflowTrigger: true,
        variant: 'card',
      }),
      {
        overflowPlacement: 'top-right',
        titleTrailingPadding:
          COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING,
      },
    );
    assert.deepEqual(
      getCompactPlayableRowShellLayout({
        hasOverflowTrigger: false,
        variant: 'card',
      }),
      {
        overflowPlacement: 'top-right',
        titleTrailingPadding: 0,
      },
    );
  });

  it('keeps row overflow in trailing actions without extra title padding', () => {
    assert.equal(COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING, 44);
    assert.deepEqual(
      getCompactPlayableRowShellLayout({
        hasOverflowTrigger: true,
        variant: 'row',
      }),
      {
        overflowPlacement: 'trailing-actions',
        titleTrailingPadding: 0,
      },
    );
  });
});
