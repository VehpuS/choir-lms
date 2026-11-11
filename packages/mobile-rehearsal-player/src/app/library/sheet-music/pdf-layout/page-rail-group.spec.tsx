import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

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

  it('turns pages with its two buttons', () => {
    const turns: string[] = [];

    render(
      <PageRailGroup
        steps={{
          ...STEPS,
          onNext: () => turns.push('next'),
          onPrevious: () => turns.push('previous'),
        }}
      />,
    );

    fireEvent.press(screen.getByLabelText(NEXT_PAGE_LABEL));
    fireEvent.press(screen.getByLabelText(PREVIOUS_PAGE_LABEL));

    assert.deepEqual(turns, ['next', 'previous']);
  });

  it('leaves Go to page to the chip over the page', () => {
    render(<PageRailGroup steps={STEPS} />);

    assert.equal(screen.queryByLabelText('Go to page'), null);
  });
});

describe('buildRailPageGroup', () => {
  it('has nothing until the PDF has reported its pages', () => {
    assert.equal(
      buildRailPageGroup({ isReady: false, steps: STEPS }),
      undefined,
    );
  });

  it('has nothing where pages are not turned', () => {
    assert.equal(
      buildRailPageGroup({ isReady: true, steps: undefined }),
      undefined,
    );
  });

  it('is a keyed group once the pages are known and turned', () => {
    assert.equal(
      buildRailPageGroup({ isReady: true, steps: STEPS })?.key,
      'page-group',
    );
  });
});
