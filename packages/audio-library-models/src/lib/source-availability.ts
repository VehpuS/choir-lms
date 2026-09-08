export type SourceAvailabilityStatus =
  | 'available'
  | 'unsupported'
  | 'unavailable';

export type SourceAvailabilityReason =
  | 'unsupported-format'
  | 'authorization-required'
  | 'access-revoked'
  | 'missing'
  | 'network'
  | 'unknown';

export type SourceAvailability = {
  status: SourceAvailabilityStatus;
  reason?: SourceAvailabilityReason;
  message?: string;
};
