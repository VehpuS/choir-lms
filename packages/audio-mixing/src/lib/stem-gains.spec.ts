import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeMix } from '@org/audio-library-models';

import { resolveStemGains } from './stem-gains.ts';

const stems = [{ id: 's' }, { id: 'a' }, { id: 't' }, { id: 'b' }];
const level = (
  extra: Partial<{ volume: number; muted: boolean; soloed: boolean }>,
) => ({
  volume: 100,
  muted: false,
  soloed: false,
  ...extra,
});
const mixOf = (levels: CompositeMix['levels']): CompositeMix => ({ levels });

describe('resolveStemGains', () => {
  it('plays every stem at 1 by default', () => {
    assert.deepEqual(resolveStemGains(stems, mixOf({})), {
      s: 1,
      a: 1,
      t: 1,
      b: 1,
    });
  });

  it('maps volume to a linear gain up to 1.5', () => {
    const gains = resolveStemGains(
      stems,
      mixOf({ s: level({ volume: 50 }), b: level({ volume: 150 }) }),
    );

    assert.equal(gains.s, 0.5);
    assert.equal(gains.b, 1.5);
  });

  it('silences a muted stem', () => {
    assert.equal(
      resolveStemGains(stems, mixOf({ a: level({ muted: true }) })).a,
      0,
    );
  });

  it('silences every stem that is not soloed', () => {
    assert.deepEqual(
      resolveStemGains(stems, mixOf({ t: level({ soloed: true }) })),
      {
        s: 0,
        a: 0,
        t: 1,
        b: 0,
      },
    );
  });

  it('plays several soloed stems together', () => {
    const gains = resolveStemGains(
      stems,
      mixOf({ s: level({ soloed: true }), a: level({ soloed: true }) }),
    );

    assert.deepEqual(gains, { s: 1, a: 1, t: 0, b: 0 });
  });

  it('lets mute win over solo on the same stem', () => {
    const gains = resolveStemGains(
      stems,
      mixOf({
        s: level({ soloed: true, muted: true }),
        a: level({ soloed: true }),
      }),
    );

    assert.deepEqual(gains, { s: 0, a: 1, t: 0, b: 0 });
  });

  it('ignores a solo on a stem that is not in the list', () => {
    assert.deepEqual(
      resolveStemGains(stems, mixOf({ gone: level({ soloed: true }) })),
      {
        s: 1,
        a: 1,
        t: 1,
        b: 1,
      },
    );
  });
});
