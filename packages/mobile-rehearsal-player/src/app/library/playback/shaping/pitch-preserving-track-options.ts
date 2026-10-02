type PitchAlgorithmConstants<Music> = { Music?: Music } | null | undefined;

/**
 * iOS only: AVPlayer time-stretches at a non-1.0 rate with the algorithm named
 * on the track, and its default (`timeDomain`) is the lower-quality one. The
 * Music algorithm is the spectral, highest-quality choice, so speed changes
 * keep pitch cleanly for polyphonic singing. Android and web ignore the field.
 * Returns nothing to merge when the player module has no such constant.
 */
export const getPitchPreservingTrackOptions = <Music>(
  pitchAlgorithms: PitchAlgorithmConstants<Music>,
): { pitchAlgorithm?: Music } => {
  const music = pitchAlgorithms?.Music;

  return music === undefined ? {} : { pitchAlgorithm: music };
};
