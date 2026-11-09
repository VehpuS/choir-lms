import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render, screen } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { CompositeLoadingPanel } from './composite-loading-panel';

const names = new Map([
  ['s', 'Soprano'],
  ['a', 'Alto'],
]);

describe('CompositeLoadingPanel', () => {
  afterEach(cleanup);

  it('lists each stem with its status while loading', () => {
    render(
      <CompositeLoadingPanel
        names={names}
        state={{
          compositeId: 'c1',
          phase: 'loading',
          stems: [
            { stemId: 's', status: 'ready', fraction: 1 },
            { stemId: 'a', status: 'loading', fraction: 0.3 },
          ],
        }}
      />,
    );

    assert.ok(hasRenderedText('Loading stems · 1 of 2 ready'));
    assert.ok(hasRenderedText('Soprano'));
    assert.ok(hasRenderedText('loading…'));
  });

  it('says it is the first time while preparing, with the stem in progress', () => {
    render(
      <CompositeLoadingPanel
        names={names}
        state={{
          compositeId: 'c1',
          phase: 'preparing',
          stems: [
            { stemId: 's', status: 'ready', fraction: 1 },
            { stemId: 'a', status: 'loading', fraction: 0.7 },
          ],
        }}
      />,
    );

    assert.ok(hasRenderedText('Preparing stems · 1 of 2 · first time only'));
    assert.ok(hasRenderedText('Preparing Alto…'));
    // The bar's value is covered by the model spec; here it is only labelled.
    assert.ok(
      screen.getByLabelText('Preparing stems · 1 of 2 · first time only'),
    );
  });
});
