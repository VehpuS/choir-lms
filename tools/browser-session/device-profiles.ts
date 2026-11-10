import { devices, type BrowserContextOptions } from 'playwright';

// Device profiles for the browser suite. Emulation changes the viewport, touch
// and CPU speed, and (with the audio tap) the audio sample rate; it does not
// change the audio stack, so real iOS Safari audio still needs WebKit.
export type DeviceProfile = {
  /** Slows the page's CPU by this factor (1 is none), to mimic a weaker phone. */
  cpuThrottle: number;
  /** The Playwright device descriptor this profile emulates. */
  device: string;
  name: string;
  /** The forced `AudioContext` sample rate, in Hz. */
  sampleRate: number;
};

const DEVICES = ['iPhone 14', 'Pixel 7', 'iPad (gen 7)', 'Desktop Chrome'];
const CPU_THROTTLES = [1, 4, 6];
const SAMPLE_RATES = [22_050, 44_100, 48_000];

const profileName = (device: string, cpu: number, rate: number) =>
  `${device.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cpu${cpu}x-${rate / 1000}k`;

const buildProfile = (
  device: string,
  cpu: number,
  rate: number,
): DeviceProfile => ({
  cpuThrottle: cpu,
  device,
  name: profileName(device, cpu, rate),
  sampleRate: rate,
});

/** One phone and one desktop at full speed: fast enough for every run. */
export const QUICK_PROFILES: DeviceProfile[] = [
  buildProfile('Pixel 7', 1, 48_000),
  buildProfile('Desktop Chrome', 1, 44_100),
];

/**
 * The matrix lane's profiles beyond the quick ones: an iPhone and an iPad
 * viewport (Chromium's audio, not Safari's), a phone with the CPU slowed six
 * times, and a desktop at the lowest sample rate, so every device, CPU speed
 * and sample rate is exercised at least once without the full cross product.
 */
export const MATRIX_PROFILES: DeviceProfile[] = [
  buildProfile('iPhone 14', 1, 44_100),
  buildProfile('iPad (gen 7)', 1, 48_000),
  buildProfile('Pixel 7', 6, 48_000),
  buildProfile('Desktop Chrome', 1, 22_050),
];

/** Every device, CPU speed and sample rate, for the matrix target. */
export const FULL_PROFILES: DeviceProfile[] = DEVICES.flatMap((device) =>
  CPU_THROTTLES.flatMap((cpu) =>
    SAMPLE_RATES.map((rate) => buildProfile(device, cpu, rate)),
  ),
);

/** The Playwright context options (viewport, touch, user agent) for a profile. */
export const contextOptionsFor = (
  profile: DeviceProfile,
): BrowserContextOptions => {
  const descriptor = devices[profile.device];

  if (!descriptor) {
    throw new Error(`Unknown Playwright device "${profile.device}"`);
  }

  return descriptor;
};
