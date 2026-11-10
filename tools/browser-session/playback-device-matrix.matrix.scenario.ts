import { MATRIX_PROFILES } from './device-profiles';
import { runSlowdownQuality } from './slowdown-quality';

// The slowdown quality checks on the rest of the matrix: other device
// descriptors (iPhone, iPad), a phone at 6x CPU slowdown, and a 22.05 kHz
// desktop (the resample path). See `device-profiles.ts` and `slowdown-quality.ts`.
void (async () => {
  for (const profile of MATRIX_PROFILES) {
    await runSlowdownQuality(profile);
  }
})();
