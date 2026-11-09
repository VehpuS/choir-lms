import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { LibraryEmptyState } from './library-empty-state';

describe('LibraryEmptyState', () => {
  afterEach(cleanup);

  it('shows what is missing, then how to add one', () => {
    render(
      <LibraryEmptyState
        message="Select two or more tracks."
        title="No composites yet"
      />,
    );

    assert.ok(hasRenderedText('No composites yet'));
    assert.ok(hasRenderedText('Select two or more tracks.'));
  });
});
