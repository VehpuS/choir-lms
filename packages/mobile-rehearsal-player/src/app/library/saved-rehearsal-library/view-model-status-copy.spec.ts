import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowSavedLibraryStatusCard } from '../components/saved-rehearsal-library-section/status-card-visibility';
import {
  AUTHORIZED_STATE,
  PLAYABLE_SOURCE,
} from '../../test-utils/library-test-fixtures.js';
import { getSavedRehearsalLibraryStatusCopy } from './view-model.js';

describe('Saved library status copy', () => {
  it('keeps per-file problems off the library summary, since each row shows its own', () => {
    const unavailable = {
      ...PLAYABLE_SOURCE,
      availability: {
        status: 'unavailable' as const,
        reason: 'missing' as const,
      },
    };

    for (const savedSources of [
      [unavailable],
      [PLAYABLE_SOURCE, unavailable],
    ]) {
      const copy = getSavedRehearsalLibraryStatusCopy({
        authState: AUTHORIZED_STATE,
        isLoading: false,
        issue: null,
        savedSources,
      });

      assert.equal(copy.tone, 'neutral');
      assert.equal(
        shouldShowSavedLibraryStatusCard({
          isLoading: false,
          isSearchPanelVisible: false,
          savedSourceCount: savedSources.length,
          statusTone: copy.tone,
        }),
        false,
      );
    }
  });
});
