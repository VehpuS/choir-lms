import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { buildPreparedCompositesSummary } from '../../library/composite/prepared/prepared-composites-model';
import { PreparedCompositesGroup } from './prepared-composites-group';

afterEach(cleanup);

describe('PreparedCompositesGroup', () => {
  it('lists each prepared composite with its stems and size', () => {
    render(
      <PreparedCompositesGroup
        summary={buildPreparedCompositesSummary(
          [{ compositeId: 'c1', stemCount: 4, sizeBytes: 72 * 1024 * 1024 }],
          [{ id: 'c1', name: 'Ubi caritas' }],
        )}
      />,
    );

    assert.ok(hasRenderedText('Prepared composites'));
    assert.ok(hasRenderedText('Ubi caritas'));
    assert.ok(hasRenderedText('4 stems'));
  });

  it('shows nothing without prepared composites', () => {
    const view = render(
      <PreparedCompositesGroup
        summary={buildPreparedCompositesSummary([], [])}
      />,
    );

    assert.equal(hasRenderedText('Prepared composites'), false);
    assert.equal(view.toJSON(), null);
  });
});
