import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { listeningOwnerId } from '../../library/composite/prepared/prepared-owner';
import { buildPreparedListeningSummary } from '../../library/playback/listening-engine/prepared-listening-model';
import { PreparedListeningGroup } from './prepared-listening-group';

afterEach(cleanup);

describe('PreparedListeningGroup', () => {
  it('lists each prepared track with its size', () => {
    render(
      <PreparedListeningGroup
        summary={buildPreparedListeningSummary(
          [
            {
              compositeId: listeningOwnerId('t1'),
              stemCount: 1,
              sizeBytes: 16 * 1024 * 1024,
            },
          ],
          () => 'Ubi caritas',
        )}
      />,
    );

    assert.ok(hasRenderedText('Prepared for listening'));
    assert.ok(hasRenderedText('Ubi caritas'));
    assert.ok(hasRenderedText('16 MB'));
  });

  it('shows nothing without prepared listening audio', () => {
    const view = render(
      <PreparedListeningGroup
        summary={buildPreparedListeningSummary([], () => undefined)}
      />,
    );

    assert.equal(view.toJSON(), null);
  });
});
