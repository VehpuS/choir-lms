import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import { LOOP, SOURCE } from './files-row-actions-test-helpers';
import {
  getFilesRowPlaybackIssue,
  isPlaybackIssueShownOnFilesRow,
} from './files-row-playback-issue';
import { shouldShowPlaybackStatusCard } from './status-card-visibility';

const trackRow: LibraryFilesRow = {
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
const loopItem = createLoopPlayableItem(LOOP, SOURCE);
const loopRow: LibraryFilesRow = {
  fileLink: {
    entityId: LOOP.id,
    entityKind: 'loop',
    id: `file-link:loop:${LOOP.id}`,
    parentFolderId: 'folder:library-root',
  },
  kind: 'loop',
  label: LOOP.name,
  loop: LOOP,
  playableItem: loopItem,
  source: SOURCE,
  supportingLabel: 'loop',
};
const trackIssue = {
  message: 'Connect to the internet to play this file.',
  playableItemId: createTrackPlayableItem(SOURCE).id,
  title: 'Needs a connection',
};

describe('Files row playback issues', () => {
  it('belongs to the row of the file it names', () => {
    assert.equal(
      getFilesRowPlaybackIssue(trackIssue, trackRow),
      trackIssue.message,
    );
    assert.equal(getFilesRowPlaybackIssue(trackIssue, loopRow), undefined);
    assert.equal(
      getFilesRowPlaybackIssue(
        { ...trackIssue, playableItemId: loopItem.id },
        loopRow,
      ),
      trackIssue.message,
    );
  });

  it('is shown on no row when no row matches or there is no issue', () => {
    assert.equal(isPlaybackIssueShownOnFilesRow(null, [trackRow]), false);
    assert.equal(isPlaybackIssueShownOnFilesRow(trackIssue, [loopRow]), false);
    assert.equal(isPlaybackIssueShownOnFilesRow(trackIssue, undefined), false);
    assert.equal(isPlaybackIssueShownOnFilesRow(trackIssue, [trackRow]), true);
  });

  it('gives the status card way only for an issue a row shows', () => {
    const base = { isSearchPanelVisible: false, statusTone: 'error' } as const;

    assert.equal(shouldShowPlaybackStatusCard(base), true);
    assert.equal(
      shouldShowPlaybackStatusCard({ ...base, isIssueShownOnRow: true }),
      false,
    );
  });
});
