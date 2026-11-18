/**
 * Who a prepared stem belongs to. The store keys every stem by an owner id and
 * a stem id. A composite owns its stems under its own id; a single track that
 * plays through the engine while a microphone is open (clear-playback-while-
 * listening design Decision 3) owns one stem under a reserved id, so both use
 * the same store, backend and reader.
 */

const LISTENING_OWNER_PREFIX = 'track:';

/** The one stem of a single track. */
export const LISTENING_STEM_ID = 'track';

export const listeningOwnerId = (trackId: string): string =>
  `${LISTENING_OWNER_PREFIX}${trackId}`;

export const isListeningOwnerId = (ownerId: string): boolean =>
  ownerId.startsWith(LISTENING_OWNER_PREFIX);

/** The track of a listening owner id; null for a composite's id. */
export const trackIdOfListeningOwner = (ownerId: string): string | null =>
  isListeningOwnerId(ownerId)
    ? ownerId.slice(LISTENING_OWNER_PREFIX.length)
    : null;

/** The prepared key of a single track at one version of its audio. */
export const listeningPreparedKey = (track: {
  id: string;
  version: string;
}) => ({
  compositeId: listeningOwnerId(track.id),
  stemId: LISTENING_STEM_ID,
  contentVersion: track.version,
});
