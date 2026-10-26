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
import { NEXT_PAGE_LABEL, PREVIOUS_PAGE_LABEL } from './page-steps';

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

  it('shows no page buttons unless it is given steps', () => {
    render(<PageIndicator onPress={() => undefined} text="Page 3 of 81" />);

    assert.equal(screen.queryByLabelText(PREVIOUS_PAGE_LABEL), null);
    assert.equal(screen.queryByLabelText(NEXT_PAGE_LABEL), null);
  });

  it('turns pages with the buttons beside the pill', () => {
    const turns: string[] = [];

    render(
      <PageIndicator
        onPress={() => undefined}
        steps={{
          canGoNext: true,
          canGoPrevious: true,
          onNext: () => turns.push('next'),
          onPrevious: () => turns.push('previous'),
        }}
        text="Page 3 of 81"
      />,
    );

    fireEvent.press(screen.getByLabelText(NEXT_PAGE_LABEL));
    fireEvent.press(screen.getByLabelText(PREVIOUS_PAGE_LABEL));

    assert.deepEqual(turns, ['next', 'previous']);
  });

  it('disables the button at either end of the document', () => {
    render(
      <PageIndicator
        onPress={() => undefined}
        steps={{
          canGoNext: false,
          canGoPrevious: true,
          onNext: () => undefined,
          onPrevious: () => undefined,
        }}
        text="Page 81 of 81"
      />,
    );

    // Under react-native-web the disabled state is the element's aria attribute.
    assert.equal(
      screen.getByLabelText(NEXT_PAGE_LABEL).props['aria-disabled'],
      true,
    );
    assert.notEqual(
      screen.getByLabelText(PREVIOUS_PAGE_LABEL).props['aria-disabled'],
      true,
    );
  });
});
