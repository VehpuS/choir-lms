import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getLayoutClass,
  LAYOUT_HYSTERESIS,
  WIDE_SHORT_MAX_HEIGHT,
  WIDE_SHORT_MIN_WIDTH,
} from './model';

const IPHONE_PORTRAIT = { height: 844, width: 390 };
const IPHONE_LANDSCAPE = { height: 390, width: 844 };
const IPAD_LANDSCAPE = { height: 768, width: 1024 };
const DESKTOP = { height: 800, width: 1280 };

describe('getLayoutClass', () => {
  it('keeps a phone held upright compact', () => {
    assert.equal(getLayoutClass(IPHONE_PORTRAIT), 'compact');
  });

  it('gives a phone on its side the wide-short layout', () => {
    assert.equal(getLayoutClass(IPHONE_LANDSCAPE), 'wide-short');
  });

  it('keeps tablets and desktop windows compact', () => {
    assert.equal(getLayoutClass(IPAD_LANDSCAPE), 'compact');
    assert.equal(getLayoutClass(DESKTOP), 'compact');
  });

  it('switches exactly at the thresholds', () => {
    const atWidth = WIDE_SHORT_MIN_WIDTH;
    const underHeight = WIDE_SHORT_MAX_HEIGHT - 1;

    assert.equal(
      getLayoutClass({ height: underHeight, width: atWidth }),
      'wide-short',
    );
    assert.equal(
      getLayoutClass({ height: underHeight, width: atWidth - 1 }),
      'compact',
    );
    assert.equal(
      getLayoutClass({ height: WIDE_SHORT_MAX_HEIGHT, width: atWidth }),
      'compact',
    );
  });

  describe('when already wide-short', () => {
    it('stays within the band below the width threshold', () => {
      const width = WIDE_SHORT_MIN_WIDTH - LAYOUT_HYSTERESIS;

      assert.equal(
        getLayoutClass({ height: 400, width }, 'wide-short'),
        'wide-short',
      );
      assert.equal(
        getLayoutClass({ height: 400, width: width - 1 }, 'wide-short'),
        'compact',
      );
    });

    it('stays within the band above the height threshold', () => {
      const height = WIDE_SHORT_MAX_HEIGHT + LAYOUT_HYSTERESIS - 1;

      assert.equal(
        getLayoutClass({ height, width: 844 }, 'wide-short'),
        'wide-short',
      );
      assert.equal(
        getLayoutClass({ height: height + 1, width: 844 }, 'wide-short'),
        'compact',
      );
    });

    it('does not flip when browser chrome grows the window past the height threshold', () => {
      // A landscape phone whose visible height moves between 480 and 520.
      let layout = getLayoutClass({ height: 480, width: 844 });

      assert.equal(layout, 'wide-short');
      layout = getLayoutClass({ height: 520, width: 844 }, layout);
      assert.equal(layout, 'wide-short');
      layout = getLayoutClass({ height: 480, width: 844 }, layout);
      assert.equal(layout, 'wide-short');
    });
  });

  describe('when compact', () => {
    it('does not enter wide-short inside the band', () => {
      assert.equal(
        getLayoutClass(
          { height: 400, width: WIDE_SHORT_MIN_WIDTH - 1 },
          'compact',
        ),
        'compact',
      );
      assert.equal(
        getLayoutClass(
          { height: WIDE_SHORT_MAX_HEIGHT + 1, width: 844 },
          'compact',
        ),
        'compact',
      );
    });

    it('is not moved by a keyboard shrinking an upright phone', () => {
      assert.equal(
        getLayoutClass({ height: 480, width: 390 }, 'compact'),
        'compact',
      );
    });
  });
});
