import type { DriveCurrentSourceLocationUnresolvedReason } from '@org/google-drive';

export type DriveSourceLocationIssueCopy = {
  message: string;
  title: string;
};

const UNRESOLVED_REASON_MESSAGES: Record<
  DriveCurrentSourceLocationUnresolvedReason,
  string
> = {
  'access-revoked':
    'Access to this file was revoked, so its current Drive location cannot be checked right now.',
  'authorization-required':
    'Reconnect Google Drive to check this file’s current Drive location.',
  missing:
    'This file could not be found in Google Drive, so its current location cannot be opened.',
  network:
    'Google Drive could not be reached to check this file’s current location.',
  'no-accessible-parent':
    'This file has no accessible Drive folder to show or open right now.',
  'unsupported-format':
    'This file’s current Drive location cannot be checked right now.',
  unknown: 'This file’s current Drive location could not be checked right now.',
};

/**
 * Maps a failed current-location resolution to the copy shown inline so the
 * user stays in place instead of the app silently reusing a stale folder.
 */
export const getDriveSourceLocationIssueCopy = (
  reason: DriveCurrentSourceLocationUnresolvedReason,
): DriveSourceLocationIssueCopy => {
  return {
    message: UNRESOLVED_REASON_MESSAGES[reason],
    title: 'Original Drive location unavailable',
  };
};
