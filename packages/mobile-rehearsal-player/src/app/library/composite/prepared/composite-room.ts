import type { StorageFit } from '@org/audio-library-models';

/**
 * Running out of storage is the only hard stop for a composite (composite-tracks
 * design Decisions 9 and 12). This turns the two ways of finding out into one
 * state for the create sheet and the playback screen: the pre-check against the
 * browser's estimate, and a write that failed because the device is full. The
 * message gives no counts, leads with freeing space and names removing stems last.
 */

export const NO_ROOM_MESSAGE =
  'There is not enough room to prepare this composite on this device.';

/** In the order they are shown: the cheapest and most reversible first. */
export const NO_ROOM_SUGGESTIONS = [
  'Clear offline files (you can keep them again later).',
  'Export and delete recordings in Settings.',
  'If that is not enough, remove stems or choose shorter tracks.',
] as const;

export type CompositeRoomAction = 'clear-offline-files';

export type CompositeRoomState =
  | { kind: 'ok' }
  | {
      kind: 'no-room';
      message: string;
      suggestions: readonly string[];
      /** `Clear offline files…` opens the existing `Clear all` confirmation. */
      actions: readonly CompositeRoomAction[];
      /** The create sheet's `Create` stays unavailable while this applies. */
      canCreate: false;
      /** After the confirmation completes, preparing is tried again. */
      retryAfterClearing: true;
    };

const NO_ROOM: CompositeRoomState = {
  kind: 'no-room',
  message: NO_ROOM_MESSAGE,
  suggestions: NO_ROOM_SUGGESTIONS,
  actions: ['clear-offline-files'],
  canCreate: false,
  retryAfterClearing: true,
};

const QUOTA_ERROR_NAMES = new Set([
  'QuotaExceededError',
  // Older Firefox reports the legacy name for the same condition.
  'NS_ERROR_DOM_QUOTA_REACHED',
]);
/** `DOMException.QUOTA_EXCEEDED_ERR`, for engines that set only the code. */
const LEGACY_QUOTA_CODE = 22;
const QUOTA_MESSAGE = /quota/i;

/** Whether a failed write means the device is full, as opposed to any other error. */
export const isStorageFullError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { name, code, message } = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
  };

  return (
    (typeof name === 'string' && QUOTA_ERROR_NAMES.has(name)) ||
    code === LEGACY_QUOTA_CODE ||
    (typeof message === 'string' && QUOTA_MESSAGE.test(message))
  );
};

/**
 * `no-room` when the pre-check says the stems do not fit or a write failed for
 * lack of space; `ok` otherwise. An unknown fit is `ok` on purpose: preparing is
 * attempted and a failed write lands here. Any other failure is not a storage
 * problem and is left for the caller's ordinary error handling.
 */
export const resolveCompositeRoom = (input: {
  fit?: StorageFit;
  failure?: unknown;
}): CompositeRoomState => {
  if (input.fit === 'does-not-fit' || isStorageFullError(input.failure)) {
    return NO_ROOM;
  }

  return { kind: 'ok' };
};
