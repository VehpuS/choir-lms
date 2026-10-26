import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { GO_TO_PAGE_FIELD_LABEL, GoToPageHeader } from './go-to-page-header';

const renderHeader = (currentPage = 11, pageCount = 81) => {
  const goneTo: number[] = [];

  render(
    <GoToPageHeader
      currentPage={currentPage}
      onGo={(page) => goneTo.push(page)}
      pageCount={pageCount}
    />,
  );

  return goneTo;
};

const field = () => screen.getByLabelText(GO_TO_PAGE_FIELD_LABEL);
const goButton = () => screen.getByLabelText('Go');
// Under react-native-web the disabled state is the element's aria attribute.
const isGoDisabled = () => goButton().props['aria-disabled'] === true;

describe('GoToPageHeader', () => {
  afterEach(cleanup);

  it('starts on the current page, counted from 1, and shows the range', () => {
    renderHeader(11, 81);

    assert.equal(field().props.value, '12');
    assert.ok(hasRenderedText('Pages 1-81'));
    assert.equal(isGoDisabled(), false);
  });

  it('goes to the typed page, 0-based, when Go is pressed', () => {
    const goneTo = renderHeader();

    fireEvent.changeText(field(), '40');
    fireEvent.press(goButton());

    assert.deepEqual(goneTo, [39]);
  });

  it('goes to the typed page when Enter is pressed in the field', () => {
    const goneTo = renderHeader();

    fireEvent.changeText(field(), '7');
    fireEvent(field(), 'submitEditing');

    assert.deepEqual(goneTo, [6]);
  });

  it('disables Go, and ignores Enter, for a number that is not a page', () => {
    const goneTo = renderHeader();

    for (const typed of ['', '0', '82', '4.5']) {
      fireEvent.changeText(field(), typed);
      fireEvent(field(), 'submitEditing');

      assert.equal(isGoDisabled(), true, `Go is disabled for "${typed}"`);
    }

    assert.deepEqual(goneTo, []);
  });

  it('accepts the first and last pages', () => {
    const goneTo = renderHeader();

    fireEvent.changeText(field(), '1');
    fireEvent(field(), 'submitEditing');
    fireEvent.changeText(field(), '81');
    fireEvent(field(), 'submitEditing');

    assert.deepEqual(goneTo, [0, 80]);
  });
});
