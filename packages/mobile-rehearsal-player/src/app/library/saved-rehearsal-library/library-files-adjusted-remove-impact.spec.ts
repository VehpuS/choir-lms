import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addTrackToPlaylist,
  createAdjustedLoop,
  createAdjustedTrackSource,
  createDriveAudioSource,
  createPlaylist,
  type RehearsalLibraryFileLinkNode,
} from '@org/audio-library-models';
import {
  AsyncStoragePracticeRepository,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
} from '@org/audio-library-runtime';

import { createLibraryFilesOperations } from './library-files-operations';
import {
  formatTrackRemoveFromLibraryImpactMessage,
  getTrackRemoveFromLibraryAffectedSections,
} from '../components/saved-rehearsal-library-section/library-files-delete-copy';

const transform = {
  pitchSemitones: 0,
  speedMultiplier: 0.8,
  tempoSource: 'multiplier' as const,
};
const SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
});
const ADJUSTED_TRACK = createAdjustedTrackSource({
  createdAt: '2026-07-02T00:00:00.000Z',
  source: SOURCE,
  transform,
});
const ADJUSTED_LOOP = createAdjustedLoop({
  id: 'loop-1',
  name: 'Entrance • 0.80×',
  ownerId: 'user-1',
  source: SOURCE,
  startMs: 12000,
  endMs: 24000,
  transform,
});
const trackLink = (entityId: string): RehearsalLibraryFileLinkNode => ({
  entityId,
  entityKind: 'track',
  id: `file-link:track:${entityId}`,
  parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
});

describe('track remove impact with adjusted entities', () => {
  const playlist = addTrackToPlaylist(
    createPlaylist({
      createdAt: '2026-07-01T00:00:00.000Z',
      name: 'Slow work',
      ownerId: 'user-1',
    }),
    ADJUSTED_TRACK,
    '2026-07-01T00:01:00.000Z',
  );
  const operations = createLibraryFilesOperations({
    explorer: null,
    options: {
      refreshSavedLoops: async () => undefined,
      refreshSavedPlaylists: async () => undefined,
      refreshSavedSources: async () => undefined,
      savedLoops: [ADJUSTED_LOOP],
      savedPlaylists: [playlist],
      savedSources: [SOURCE, ADJUSTED_TRACK],
    },
    practiceRepository: {} as AsyncStoragePracticeRepository,
    setCurrentFolderId: () => undefined,
    setIssue: () => undefined,
    setTree: () => undefined,
    tree: {
      fileLinks: [trackLink(SOURCE.id), trackLink(ADJUSTED_TRACK.id)],
      folders: [
        {
          createdAt: '2026-07-01T00:00:00.000Z',
          id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          name: 'Library',
          parentFolderId: null,
        },
      ],
      rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      version: 1,
    },
  });
  const impact = operations.getTrackRemoveFromLibraryImpact(SOURCE.id);

  it('counts the adjusted tracks, their links, loops and playlist entries', () => {
    assert.equal(impact.adjustedTrackCount, 1);
    assert.deepEqual(impact.adjustedTrackNames, [ADJUSTED_TRACK.name]);
    assert.equal(impact.fileLinkCount, 2);
    assert.deepEqual(impact.loopNames, ['Entrance • 0.80×']);
    assert.equal(impact.playlistEntryCount, 1);
  });

  it('lists the adjusted tracks first in the confirmation', () => {
    assert.deepEqual(
      getTrackRemoveFromLibraryAffectedSections(impact).map(
        ({ title }) => title,
      ),
      [
        'Adjusted tracks (1)',
        'Saved loops (1)',
        'Folder links (2)',
        'Playlist entries (1)',
      ],
    );
    assert.match(
      formatTrackRemoveFromLibraryImpactMessage(
        { kind: 'track', source: SOURCE } as never,
        impact,
      ),
      /Review affected items/,
    );
  });

  it('removing only the adjusted track affects nothing but itself', () => {
    const adjustedImpact = operations.getTrackRemoveFromLibraryImpact(
      ADJUSTED_TRACK.id,
    );

    assert.equal(adjustedImpact.adjustedTrackCount, 0);
    assert.equal(adjustedImpact.fileLinkCount, 1);
    assert.equal(adjustedImpact.loopCount, 0);
  });
});
