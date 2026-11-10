import type { DriveAuthorizationStatus } from '@org/google-drive';

import type { AppIconName } from '../../../components/app-icon/model';
import type { DriveLibrarySource } from './drive-library-view-model';

export type DriveSessionBannerCopy = {
  actionLabel: string;
  title: string;
  tone: 'neutral' | 'warning';
};

export type SourceAccessChip = {
  icon: AppIconName;
  label: string;
  tone: 'warning' | 'error';
};

const SESSION_EXPIRED_BANNER: DriveSessionBannerCopy = {
  actionLabel: 'Reconnect',
  title: 'Drive disconnected',
  tone: 'warning',
};

// Never signed in is not a fault, so it keeps the neutral tone.
const SESSION_NOT_CONNECTED_BANNER: DriveSessionBannerCopy = {
  actionLabel: 'Connect',
  title: 'Connect Google Drive',
  tone: 'neutral',
};

// One short label per file-level reason, so a row never needs a second line.
// The full sentence stays in the row menu and the detail sheet.
const ACCESS_CHIPS: Partial<
  Record<
    NonNullable<DriveLibrarySource['availability']['reason']>,
    SourceAccessChip
  >
> = {
  'needs-access': {
    icon: 'alert-outline',
    label: 'Needs access',
    tone: 'warning',
  },
  'access-revoked': {
    icon: 'alert-outline',
    label: 'Access removed',
    tone: 'warning',
  },
  missing: { icon: 'alert-outline', label: 'Not found', tone: 'error' },
  network: { icon: 'cloud-slash', label: 'Offline', tone: 'warning' },
};

/**
 * The one banner for a session-level problem (expired or never signed in), or
 * null while connected. Rows stay quiet because every one would repeat it.
 */
export const getDriveSessionBannerCopy = (
  status: DriveAuthorizationStatus,
): DriveSessionBannerCopy | null => {
  if (status === 'authorized') {
    return null;
  }

  return status === 'expired'
    ? SESSION_EXPIRED_BANNER
    : SESSION_NOT_CONNECTED_BANNER;
};

/** The short chip for a file-level problem, or null when the row has none. */
export const getSourceAccessChip = (
  source: Pick<DriveLibrarySource, 'availability'>,
): SourceAccessChip | null => {
  const { reason, status } = source.availability;

  if (status !== 'unavailable' || reason === undefined) {
    return null;
  }

  return ACCESS_CHIPS[reason] ?? null;
};
