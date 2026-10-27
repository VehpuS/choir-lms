import type { PitchReading, Sensitivity } from '@org/pitch-detection';

import type { PcmPermission } from './pcm-source-types';

export type PitchStatus =
  | 'off'
  /** The first press of `Listen`: explain before the system prompt. */
  | 'explain'
  | 'starting'
  | 'listening'
  | 'paused-hidden'
  | 'interrupted'
  | 'blocked'
  | 'unavailable'
  | 'in-use';

export type PitchState = {
  status: PitchStatus;
  /** The user's choice to listen; capture also needs a consumer and visibility. */
  listening: boolean;
  permission: PcmPermission;
  reading: PitchReading;
  /** The one-time "assumes headphones" note is waiting to be dismissed. */
  headphonesNotePending: boolean;
  /** Listening just resumed after pausing in the background. */
  backgroundNoticePending: boolean;
  sensitivity: Sensitivity;
  referenceHz: number;
};

/** Only these two flags are ever stored; audio never is. */
export type PitchFlagStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const PITCH_EXPLAINED_KEY = 'choirlms.pitch.explained';
export const PITCH_HEADPHONES_DISMISSED_KEY =
  'choirlms.pitch.headphonesDismissed';
/** How long to wait before reopening a microphone the platform closed. */
export const PITCH_RETRY_MS = 2000;
export const FLAG_ON = 'true';
export const IDLE_READING: PitchReading = { active: false };

export const FAILURE_STATUS = {
  denied: 'blocked',
  unavailable: 'unavailable',
  'in-use': 'in-use',
} as const;

export const FAILURE_STATUSES: readonly PitchStatus[] = [
  'blocked',
  'unavailable',
  'in-use',
];

/** After these, the store may start capture again without the user asking. */
export const AUTO_START_STATUSES: readonly PitchStatus[] = [
  'off',
  'paused-hidden',
  'interrupted',
];
