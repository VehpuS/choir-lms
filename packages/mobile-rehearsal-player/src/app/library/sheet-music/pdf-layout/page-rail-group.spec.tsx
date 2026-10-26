import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { PAGE_INDICATOR_LABEL } from './page-indicator';
import { PageRailGroup, buildRailPageGroup } from './page-rail-group';
import { NEXT_PAGE_LABEL, PREVIOUS_PAGE_LABEL } from './page-steps';

const STEPS = {
  canGoNext: true,
  canGoPrevious: true,
  onNext: () => undefined,
  onPrevious: () => undefined,
};

describe('PageRailGroup', () => {
  afterEach(cleanup);

  it('shows the short page text and opens Go to page when pressed', () => {
    let opened = 0;

    render(
      <PageRailGroup
        onPress={() => {
          opened += 1;
        }}
        text="3/81"
      />,
    );

    assert.ok(hasRenderedText('3/81'));

    fireEvent.press(screen.getByLabelText(PAGE_INDICATOR_LABEL));

    assert.equal(opened, 1);
  });

  it('has no page buttons where pages are not turned', () => {
    render(<PageRailGroup onPress={() => undefined} text="3/81" />);

    assert.equal(screen.queryByLabelText(PREVIOUS_PAGE_LABEL), null);
    assert.equal(screen.queryByLabelText(NEXT_PAGE_LABEL), null);
  });

  it('turns pages with the buttons around the label', () => {
    const turns: string[] = [];

    render(
      <PageRailGroup
        onPress={() => undefined}
        steps={{
          ...STEPS,
          onNext: () => turns.push('next'),
          onPrevious: () => turns.push('previous'),
        }}
        text="3/81"
      />,
    );

    fireEvent.press(screen.getByLabelText(NEXT_PAGE_LABEL));
    fireEvent.press(screen.getByLabelText(PREVIOUS_PAGE_LABEL));

    assert.deepEqual(turns, ['next', 'previous']);
  });
});

describe('buildRailPageGroup', () => {
  it('has nothing until the PDF has reported its pages', () => {
    assert.equal(
      buildRailPageGroup({
        onOpen: () => undefined,
        shortIndicator: undefined,
        steps: STEPS,
      }),
      undefined,
    );
  });

  it('has nothing while Go to page cannot open', () => {
    assert.equal(
      buildRailPageGroup({
        onOpen: undefined,
        shortIndicator: '3/81',
        steps: STEPS,
      }),
      undefined,
    );
  });

  it('is a keyed group once both are there', () => {
    const group = buildRailPageGroup({
      onOpen: () => undefined,
      shortIndicator: '3/81',
      steps: STEPS,
    });

    assert.equal(group?.key, 'page-group');
  });
});
