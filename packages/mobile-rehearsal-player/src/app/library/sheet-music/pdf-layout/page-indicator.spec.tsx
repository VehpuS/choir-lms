import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { PAGE_INDICATOR_LABEL, PageIndicator } from './page-indicator';

describe('PageIndicator', () => {
  afterEach(cleanup);

  it('shows the page text it is given', () => {
    render(<PageIndicator onPress={() => undefined} text="Page 3 of 81" />);

    assert.ok(hasRenderedText('Page 3 of 81'));
  });

  it('is a button named Go to page that opens the sheet when pressed', () => {
    let opened = 0;

    render(
      <PageIndicator
        onPress={() => {
          opened += 1;
        }}
        text="Page 3 of 81"
      />,
    );

    const button = screen.getByLabelText(PAGE_INDICATOR_LABEL);

    assert.equal(PAGE_INDICATOR_LABEL, 'Go to page');
    assert.equal(button.props.role, 'button');

    fireEvent.press(button);

    assert.equal(opened, 1);
  });
});
