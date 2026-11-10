import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import {
  BrowseSourceRow,
  type BrowseSourceRowSharedProps,
} from './browse-source-row';

const FILE_MESSAGE = 'This file could not be found in Google Drive.';
const SESSION_MESSAGE = 'Reconnect Google Drive to restore this saved track.';

const createSource = (
  availability: ReturnType<typeof createDriveAudioSource>['availability'],
) => {
  return createDriveAudioSource({
    availability,
    driveFileId: 'drive-file-1',
    durationMs: 245000,
    mimeType: 'audio/mpeg',
    name: 'Ave Verum.mp3',
  });
};

const createCalls = () => ({ plays: [] as string[], reconnects: 0 });

const renderRow = (options: {
  calls: ReturnType<typeof createCalls>;
  canReconnectSource?: boolean;
  isDriveSessionDisconnected?: boolean;
  source: ReturnType<typeof createSource>;
}) => {
  const props = {
    activePlayableItem: null,
    canMutateLibrary: true,
    canMutateLoops: true,
    canMutatePlaylists: true,
    canQueueAsNext: false,
    canReconnectSource: options.canReconnectSource ?? true,
    isDriveSessionDisconnected: options.isDriveSessionDisconnected ?? false,
    isLoopMutating: false,
    isPlaybackPreparing: false,
    isPlaylistMutating: false,
    isSavedLibraryMutating: false,
    onOpenLoopBuilderForSource: () => undefined,
    onOpenSourceTagEditor: () => undefined,
    onReconnectSource: () => {
      options.calls.reconnects += 1;
    },
    onRenameSource: () => undefined,
    openSourcePlaylistSelector: () => undefined,
    openTrackLoopView: () => undefined,
    originalLocationActions: {
      pendingSourceLocationAction: null,
    },
    pendingLoopBuilderSourceId: null,
    pendingSourceId: null,
    playbackIssue: null,
    playbackState: 'idle',
    queuePlayableItemNext: () => undefined,
    queuePlayableItemUpNext: () => undefined,
    removeSource: () => undefined,
    savedLibraryIssue: null,
    searchQuery: null,
    toggleSourcePlayback: (source: { id: string }) => {
      options.calls.plays.push(source.id);
      return Promise.resolve();
    },
  } as unknown as BrowseSourceRowSharedProps;

  return render(
    <BrowseSourceRow
      {...props}
      index={0}
      isMenuOpen={false}
      loopCount={0}
      onCloseMenu={() => undefined}
      onOpenMenu={() => undefined}
      source={options.source}
    />,
  );
};

// The row's press target has no accessible name, so role and label queries
// cannot reach it; the prop query finds the same pressable a user taps.
const pressRow = () => {
  fireEvent.press(screen.UNSAFE_getAllByProps({ role: 'button' })[0]);
};

describe('BrowseSourceRow Drive access states', () => {
  afterEach(cleanup);

  it('shows a short chip instead of the sentence for a file-level problem', () => {
    renderRow({
      calls: createCalls(),
      source: createSource({
        message: FILE_MESSAGE,
        reason: 'missing',
        status: 'unavailable',
      }),
    });

    assert.ok(hasRenderedText('Not found'));
    assert.equal(hasRenderedText(FILE_MESSAGE), false);
  });

  it('keeps the sentence when the reason has no short chip', () => {
    renderRow({
      calls: createCalls(),
      source: createSource({
        message: 'Something unexpected happened.',
        reason: 'unknown',
        status: 'unavailable',
      }),
    });

    assert.ok(hasRenderedText('Something unexpected happened.'));
  });

  it('stays quiet while the session is disconnected: no message, no chip', () => {
    renderRow({
      calls: createCalls(),
      isDriveSessionDisconnected: true,
      source: createSource({
        message: SESSION_MESSAGE,
        reason: 'authorization-required',
        status: 'unavailable',
      }),
    });

    assert.ok(hasRenderedText('Ave Verum.mp3'));
    assert.equal(hasRenderedText(SESSION_MESSAGE), false);
    assert.equal(hasRenderedText('Access removed'), false);
  });

  it('starts Reconnect, not playback, when a disconnected row is pressed', () => {
    const calls = createCalls();

    renderRow({
      calls,
      isDriveSessionDisconnected: true,
      source: createSource({
        message: SESSION_MESSAGE,
        reason: 'authorization-required',
        status: 'unavailable',
      }),
    });
    pressRow();

    assert.equal(calls.reconnects, 1);
    assert.deepEqual(calls.plays, []);
  });

  it('plays an available row when it is pressed', () => {
    const calls = createCalls();
    const source = createSource({ status: 'available' });

    renderRow({ calls, source });
    pressRow();

    assert.deepEqual(calls.plays, [source.id]);
    assert.equal(calls.reconnects, 0);
  });
});
