import {
  resolveNamedLoopParentTrack,
  type DriveAudioSource,
  type NamedLoop,
  type PlaylistEntry,
} from './rehearsal-domain.ts';

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
