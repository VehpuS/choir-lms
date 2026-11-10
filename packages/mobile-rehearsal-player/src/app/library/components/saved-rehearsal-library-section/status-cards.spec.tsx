import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { SavedRehearsalLibraryStatusCards } from './status-cards';
import type { SavedRehearsalLibrarySectionProps } from './types';

const LEGACY_TITLE = 'Saved tracks need Drive access';
const LEGACY_COPY = {
  message: 'Reconnect Google Drive before playback can use them.',
  title: LEGACY_TITLE,
  tone: 'warning' as const,
};

type Authorization = NonNullable<
  SavedRehearsalLibrarySectionProps['authorization']
>;

const createAuthorization = (
  status: 'authorized' | 'expired',
  starts: number[] = [],
  canStartAuthorization = true,
) => {
  return {
    authState: { scope: 'drive', status },
    canStartAuthorization,
    isBusy: false,
    startAuthorization: () => {
      starts.push(1);
      return Promise.resolve();
    },
  } as unknown as Authorization;
};

const renderCards = (
  overrides: Partial<Parameters<typeof SavedRehearsalLibraryStatusCards>[0]>,
) => {
  return render(
    <SavedRehearsalLibraryStatusCards
      isPlaybackIssueShownOnRow={false}
      isSavedLibraryLoading={false}
      isSearchPanelVisible={false}
      savedLibraryStatusCopy={LEGACY_COPY}
      savedSourceCount={3}
      savedTrackPlaybackStatusCopy={null}
      {...overrides}
    />,
  );
};

describe('SavedRehearsalLibraryStatusCards session banner', () => {
  afterEach(cleanup);

  it('replaces the paragraph card with one Reconnect banner when the session expired', () => {
    const starts: number[] = [];

    renderCards({ authorization: createAuthorization('expired', starts) });
    fireEvent.press(screen.getByLabelText('Reconnect'));

    assert.ok(hasRenderedText('Drive disconnected'));
    assert.equal(hasRenderedText(LEGACY_TITLE), false);
    assert.deepEqual(starts, [1]);
  });

  it('shows the banner without an action when authorization cannot start', () => {
    renderCards({
      authorization: createAuthorization('expired', [], false),
    });

    assert.ok(hasRenderedText('Drive disconnected'));
    assert.equal(screen.queryByLabelText('Reconnect'), null);
  });

  it('shows no banner while connected and leaves the ordinary status card alone', () => {
    renderCards({ authorization: createAuthorization('authorized') });

    assert.equal(hasRenderedText('Drive disconnected'), false);
    assert.ok(hasRenderedText(LEGACY_TITLE));
  });

  it('shows no banner when no tracks are saved', () => {
    renderCards({
      authorization: createAuthorization('expired'),
      savedSourceCount: 0,
    });

    assert.equal(hasRenderedText('Drive disconnected'), false);
  });

  it('hides the banner while the search panel is open', () => {
    renderCards({
      authorization: createAuthorization('expired'),
      isSearchPanelVisible: true,
    });

    assert.equal(hasRenderedText('Drive disconnected'), false);
  });
});
