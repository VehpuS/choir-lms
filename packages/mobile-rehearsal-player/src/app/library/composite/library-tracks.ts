import type { DriveAudioSource } from '@org/audio-library-models';

/**
 * The library's tracks for code that runs outside React (the composite engine
 * loader). A host component publishes them whenever the library changes, so the
 * loader sees the current tracks, including their content versions.
 */
let tracks: ReadonlyMap<string, DriveAudioSource> = new Map();

export const publishLibraryTracks = (
  sources: readonly DriveAudioSource[],
): void => {
  tracks = new Map(sources.map((source) => [source.id, source]));
};

export const getLibraryTrack = (
  trackId: string,
): DriveAudioSource | undefined => tracks.get(trackId);
