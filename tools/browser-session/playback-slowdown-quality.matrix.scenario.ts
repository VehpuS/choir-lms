import { QUICK_PROFILES, type DeviceProfile } from './device-profiles';
import { runSlowdownQuality } from './slowdown-quality';

// The slowdown quality checks on the quick profiles: a phone, a desktop, and
// the phone with the CPU slowed four times. See `slowdown-quality.ts`.
const phone = QUICK_PROFILES[0];
const slowPhone: DeviceProfile = {
  ...phone,
  cpuThrottle: 4,
  name: 'pixel-7-cpu4x-48k',
};

void (async () => {
  await runSlowdownQuality(phone);
  await runSlowdownQuality(QUICK_PROFILES[1]);
  await runSlowdownQuality(slowPhone);
})();
