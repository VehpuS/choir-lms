import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { getSourceAccessChip } from '../utils/drive-access-copy';
import { AccessChip } from './access-chip';

const REASON_LABELS = [
  ['needs-access', 'Needs access'],
  ['access-revoked', 'Access removed'],
  ['missing', 'Not found'],
  ['network', 'Offline'],
] as const;

describe('AccessChip', () => {
  afterEach(cleanup);

  for (const [reason, label] of REASON_LABELS) {
    it(`renders "${label}" for a ${reason} file`, () => {
      const chip = getSourceAccessChip({
        availability: { reason, status: 'unavailable' },
      });

      assert.ok(chip);
      render(<AccessChip chip={chip} />);

      assert.ok(hasRenderedText(label));
    });
  }
});
