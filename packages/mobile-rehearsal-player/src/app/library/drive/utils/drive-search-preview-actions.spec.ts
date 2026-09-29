/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAYABLE_SOURCE,
  UNSUPPORTED_SOURCE,
} from '../../../test-utils/library-test-fixtures.js';
import { resolveDriveSourceActions } from './drive-search-preview-actions.js';

const FILE_URL = 'https://drive.google.com/file/d/alto-line/view';

type ActionOptions = Parameters<typeof resolveDriveSourceActions>[0];

const buildOptions = (
  overrides: Partial<ActionOptions> = {},
): ActionOptions => {
  return {
    activePlayableItem: null,
    canMutateLibrary: true,
    isLibraryLoading: false,
    isLibraryMutating: false,
    isPreparingPlayback: false,
    isSaved: false,
    isSavePending: false,
    onOpenInGoogleDrive: () => undefined,
    onPreviewPlayback: () => undefined,
    onRemoveSource: () => undefined,
    onSaveSource: () => undefined,
    playbackState: undefined,
    source: { ...PLAYABLE_SOURCE, webViewLink: FILE_URL },
    ...overrides,
  };
};

const summarize = (actions: ReturnType<typeof resolveDriveSourceActions>) => {
  return actions.map((action) => {
    return {
      disabled: action.disabled ?? false,
      kind: action.kind,
      label: action.label,
      placement: action.placement,
    };
  });
};

describe('drive search preview actions', () => {
  it('gives an unsaved row a preview ring and Save pill inline, and a full menu', () => {
    const actions = resolveDriveSourceActions(buildOptions());

    assert.deepEqual(summarize(actions), [
      { disabled: false, kind: undefined, label: 'Play', placement: 'inline' },
      { disabled: false, kind: undefined, label: 'Save', placement: 'inline' },
      {
        disabled: false,
        kind: undefined,
        label: 'Play preview',
        placement: 'menu',
      },
      {
        disabled: false,
        kind: undefined,
        label: 'Save to Library',
        placement: 'menu',
      },
      {
        disabled: false,
        kind: undefined,
        label: 'Open in Google Drive',
        placement: 'menu',
      },
    ]);
    assert.equal(actions[0]?.iconName, 'play');
    assert.equal(
      actions[1]?.accessibilityLabel,
      'Save Alto Line.mp3 to Library',
    );
  });

  it('turns Save into a Saved toggle that starts removal, and keeps removal in the menu', () => {
    let removeCount = 0;
    const toggleActions = resolveDriveSourceActions(
      buildOptions({
        isSaved: true,
        onRemoveSource: () => {
          removeCount += 1;
        },
      }),
    );

    toggleActions[1]?.onPress();
    assert.equal(removeCount, 1);
    assert.equal(toggleActions[1]?.disabled, false);
    assert.equal(
      toggleActions[1]?.accessibilityLabel,
      'Alto Line.mp3 is saved to Library',
    );

    const actions = resolveDriveSourceActions(buildOptions({ isSaved: true }));

    assert.deepEqual(
      summarize(actions).map((action) => [action.label, action.kind]),
      [
        ['Play', undefined],
        ['Saved', 'saved-toggle'],
        ['Play preview', undefined],
        ['Remove from library', undefined],
        ['Open in Google Drive', undefined],
      ],
    );
    assert.equal(actions[3]?.tone, 'destructive');
  });

  it('keeps playback and pending-save labels for an active, saving row', () => {
    const actions = resolveDriveSourceActions(
      buildOptions({
        activePlayableItem: {
          description: 'Full track',
          id: 'track:drive:alto-line',
          kind: 'track',
          playlistEntryId: undefined,
          playlistId: undefined,
          range: { endMs: 185000, startMs: 0 },
          source: PLAYABLE_SOURCE,
          sourceId: PLAYABLE_SOURCE.id,
          title: PLAYABLE_SOURCE.name,
        },
        isSaved: true,
        isSavePending: true,
        playbackState: 'playing',
      }),
    );

    assert.equal(actions[0]?.label, 'Pause');
    assert.equal(actions[0]?.iconName, 'pause');
    assert.equal(actions[1]?.label, 'Removing…');
    assert.equal(actions[2]?.label, 'Pause');
  });

  it('only offers Open in Google Drive for a file outside the supported audio set', () => {
    const actions = resolveDriveSourceActions(
      buildOptions({
        source: { ...UNSUPPORTED_SOURCE, webViewLink: FILE_URL },
      }),
    );

    assert.deepEqual(summarize(actions), [
      {
        disabled: false,
        kind: undefined,
        label: 'Open in Google Drive',
        placement: 'menu',
      },
    ]);
  });

  it('disables Open in Google Drive when Drive returned no link', () => {
    const actions = resolveDriveSourceActions(
      buildOptions({ source: { ...PLAYABLE_SOURCE, webViewLink: undefined } }),
    );

    assert.equal(actions.at(-1)?.label, 'Open in Google Drive');
    assert.equal(actions.at(-1)?.disabled, true);
  });
});
