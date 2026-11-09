export type SourceAvailabilityStatus =
  | 'available'
  | 'unsupported'
  | 'unavailable';

export type SourceAvailabilityReason =
  | 'unsupported-format'
  | 'authorization-required'
  | 'access-revoked'
  /** Imported from a bundle and not shared with this user yet; repaired by getting access. */
  | 'needs-access'
  | 'missing'
  | 'network'
  | 'unknown';

export type SourceAvailability = {
  status: SourceAvailabilityStatus;
  reason?: SourceAvailabilityReason;
  message?: string;
};
