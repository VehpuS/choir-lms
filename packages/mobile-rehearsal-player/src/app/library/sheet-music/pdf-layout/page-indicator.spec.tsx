import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { PageIndicator } from './page-indicator';

describe('PageIndicator', () => {
  afterEach(cleanup);

  it('shows the page text it is given', () => {
    render(<PageIndicator text="Page 3 of 81" />);

    assert.ok(hasRenderedText('Page 3 of 81'));
  });
});
