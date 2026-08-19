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

export type DriveAudioSource = {
  id: string;
  provider: 'google-drive';
  driveFileId: string;
  name: string;
  mimeType: string;
  extension?: string;
  durationMs?: number;
  sizeBytes?: number;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  createdAt: string;
  availability: SourceAvailability;
};

export type PlayableRange = {
  startMs: number;
  endMs: number | null;
};

export type PlayableItemKind = 'track' | 'loop';

export type PlayableItem = {
  id: string;
  kind: PlayableItemKind;
  title: string;
  sourceId: string;
  source: DriveAudioSource;
  range: PlayableRange;
  loopId?: string;
  playlistId?: string;
  playlistEntryId?: string;
  description?: string;
};

export type NamedLoop = {
  id: string;
  name: string;
  sourceId: string;
  sourceName: string;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  startMs: number;
  endMs: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type NamedLoopParentTrack = {
  id: string;
  name: string;
};

export type PlaylistEntry = {
  id: string;
  playlistId: string;
  sortIndex: number;
  kind: PlayableItemKind;
  sourceId: string;
  loopId?: string;
  title: string;
  description?: string;
  createdAt: string;
};

export type PlaylistEntryInput = Omit<
  PlaylistEntry,
  'playlistId' | 'sortIndex'
> & {
  playlistId?: string;
  sortIndex?: number;
};

export type Playlist = {
  id: string;
  name: string;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  items: PlaylistEntry[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type RehearsalLibraryEntityKind = PlayableItemKind | 'playlist';

export type RehearsalLibraryFolderNode = {
  id: string;
  name: string;
  parentFolderId: string | null;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  createdAt: string;
};

export type RehearsalLibraryFileLinkNode = {
  id: string;
  parentFolderId: string;
  entityKind: RehearsalLibraryEntityKind;
  entityId: string;
  visibleName?: string;
};

export type RehearsalLibraryFileTree = {
  version: 1;
  rootFolderId: string;
  folders: RehearsalLibraryFolderNode[];
  fileLinks: RehearsalLibraryFileLinkNode[];
};

export type RehearsalQueueMode = 'ordered' | 'shuffle';

export type RepeatMode = 'off' | 'one' | 'all';

export type LoopValidationResult = {
  isValid: boolean;
  error?: string;
  normalizedStartMs: number;
  normalizedEndMs: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

const isStringRecord = (value: unknown): value is Record<string, string> => {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
};

const clampToDuration = (value: number, durationMs?: number) => {
  if (durationMs === undefined) {
    return value;
  }

  return Math.min(value, durationMs);
};

export const createDriveAudioSource = (
  source: Omit<DriveAudioSource, 'id' | 'provider' | 'createdAt'> & {
    createdAt?: string;
  },
): DriveAudioSource => {
  return {
    ...source,
    id: `drive:${source.driveFileId}`,
    provider: 'google-drive',
    createdAt: source.createdAt ?? new Date().toISOString(),
  };
};

export const updateSourceAvailability = (
  source: DriveAudioSource,
  availability: SourceAvailability,
): DriveAudioSource => {
  return {
    ...source,
    availability,
  };
};

export const isSourcePlayable = (source: DriveAudioSource) => {
  return source.availability.status === 'available';
};

export const isNamedLoop = (value: unknown): value is NamedLoop => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.sourceId === 'string' &&
    typeof value.sourceName === 'string' &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    (value.tagAddedAt === undefined || isStringRecord(value.tagAddedAt)) &&
    typeof value.startMs === 'number' &&
    typeof value.endMs === 'number' &&
    typeof value.ownerId === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const resolveNamedLoopParentTrack = (
  loop: Pick<NamedLoop, 'sourceId' | 'sourceName'>,
): NamedLoopParentTrack => {
  return {
    id: loop.sourceId,
    name: loop.sourceName,
  };
};

export const validateLoopRange = (
  startMs: number,
  endMs: number,
  durationMs?: number,
): LoopValidationResult => {
  const normalizedStartMs = clampToDuration(Math.max(0, startMs), durationMs);
  const normalizedEndMs = clampToDuration(Math.max(0, endMs), durationMs);

  if (
    !Number.isFinite(normalizedStartMs) ||
    !Number.isFinite(normalizedEndMs)
  ) {
    return {
      isValid: false,
      error: 'Loop markers must be finite numbers.',
      normalizedStartMs,
      normalizedEndMs,
    };
  }

  if (normalizedEndMs <= normalizedStartMs) {
    return {
      isValid: false,
      error: 'Loop end must be after the loop start.',
      normalizedStartMs,
      normalizedEndMs,
    };
  }

  return {
    isValid: true,
    normalizedStartMs,
    normalizedEndMs,
  };
};

export const createTrackPlayableItem = (
  source: DriveAudioSource,
  playlistId?: string,
  playlistEntryId?: string,
): PlayableItem => {
  return {
    id: `track:${source.id}`,
    kind: 'track',
    title: source.name,
    sourceId: source.id,
    source,
    range: {
      startMs: 0,
      endMs: source.durationMs ?? null,
    },
    playlistId,
    ...(playlistEntryId ? { playlistEntryId } : {}),
    description: 'Full track',
  };
};

export const createLoopPlayableItem = (
  loop: NamedLoop,
  source: DriveAudioSource,
  playlistId?: string,
  playlistEntryId?: string,
): PlayableItem => {
  const parentTrack = resolveNamedLoopParentTrack(loop);

  return {
    id: `loop:${loop.id}`,
    kind: 'loop',
    title: loop.name,
    sourceId: parentTrack.id,
    source,
    range: {
      startMs: loop.startMs,
      endMs: loop.endMs,
    },
    loopId: loop.id,
    playlistId,
    ...(playlistEntryId ? { playlistEntryId } : {}),
    description: `${parentTrack.name} loop`,
  };
};

export const createPlaylistEntryFromTrack = (
  source: DriveAudioSource,
  createdAt: string,
  options?: {
    playlistId?: string;
    sortIndex?: number;
  },
): PlaylistEntry => {
  return {
    id: `entry:track:${source.id}:${createdAt}`,
    playlistId: options?.playlistId ?? '',
    sortIndex: options?.sortIndex ?? 0,
    kind: 'track',
    sourceId: source.id,
    title: source.name,
    description: 'Full track',
    createdAt,
  };
};

export const createPlaylistEntryFromLoop = (
  loop: NamedLoop,
  createdAt: string,
  options?: {
    playlistId?: string;
    sortIndex?: number;
  },
): PlaylistEntry => {
  const parentTrack = resolveNamedLoopParentTrack(loop);

  return {
    id: `entry:loop:${loop.id}:${createdAt}`,
    playlistId: options?.playlistId ?? '',
    sortIndex: options?.sortIndex ?? 0,
    kind: 'loop',
    sourceId: parentTrack.id,
    loopId: loop.id,
    title: loop.name,
    description: `${parentTrack.name} loop`,
    createdAt,
  };
};
