import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, renderHook } from '@testing-library/react-native/pure';

import type {
  PartSelectionRequest,
  SheetMusicPartSelection,
} from '@org/audio-library-models';

import type { MyPartsPreferences } from './my-parts-model';
import { useRequestedSelection } from './use-requested-selection';

type HookProps = {
  own: SheetMusicPartSelection | undefined;
  preferences: MyPartsPreferences;
};

const PREFERENCES: MyPartsPreferences = {
  latestPart: 'Tenor',
  parts: ['Alto 2', 'Alto'],
};

describe('useRequestedSelection', () => {
  afterEach(cleanup);

  it('returns the same object across re-renders with the same inputs', () => {
    // The viewer's surface redraws whenever this changes identity, so a fresh
    // object per render once made the page redraw without end.
    const { rerender, result } = renderHook<
      PartSelectionRequest | undefined,
      HookProps
    >(({ own, preferences }) => useRequestedSelection(own, preferences), {
      initialProps: { own: undefined, preferences: PREFERENCES },
    });
    const first = result.current;

    rerender({ own: undefined, preferences: PREFERENCES });
    rerender({ own: undefined, preferences: PREFERENCES });

    assert.deepEqual(first, {
      learnedPart: 'Tenor',
      preferParts: ['Alto 2', 'Alto'],
    });
    assert.equal(result.current, first);
  });

  it('asks again when the preferences change', () => {
    const { rerender, result } = renderHook<
      PartSelectionRequest | undefined,
      HookProps
    >(({ own, preferences }) => useRequestedSelection(own, preferences), {
      initialProps: { own: undefined, preferences: PREFERENCES },
    });
    const first = result.current;

    rerender({
      own: undefined,
      preferences: { ...PREFERENCES, parts: ['Bass'] },
    });

    assert.notEqual(result.current, first);
    assert.deepEqual(result.current, {
      learnedPart: 'Tenor',
      preferParts: ['Bass'],
    });
  });

  it("keeps a source's own saved selection over the preferences", () => {
    const { result } = renderHook(() =>
      useRequestedSelection('all', PREFERENCES),
    );

    assert.equal(result.current, 'all');
  });
});
