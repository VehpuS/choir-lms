/**
 * Keeps the piano recordings' encoded bytes in memory once fetched, so the
 * warm-up at app start and the piano's own load share one fetch each and the
 * piano opens with nothing left to download. `decodeAudioData` detaches the
 * buffer it is given, so each caller gets its own copy. A failed fetch is not
 * remembered, so the next ask tries again.
 */
export const createPianoSampleCache = (
  fetchBytes: (midi: number) => Promise<ArrayBuffer>,
) => {
  const pending = new Map<number, Promise<ArrayBuffer>>();

  const fetchOnce = (midi: number) => {
    let bytes = pending.get(midi);

    if (!bytes) {
      bytes = fetchBytes(midi);
      pending.set(midi, bytes);
      bytes.catch(() => {
        // Forget it, only if it is still the one remembered.
        if (pending.get(midi) === bytes) {
          pending.delete(midi);
        }
      });
    }

    return bytes;
  };

  return {
    /** The recording's bytes: a private copy, fetched at most once. */
    load: async (midi: number): Promise<ArrayBuffer> =>
      (await fetchOnce(midi)).slice(0),
    /** Starts fetching these recordings; failures are left for `load`. */
    warm: (midis: readonly number[]) => {
      midis.forEach((midi) => {
        fetchOnce(midi).catch(() => undefined);
      });
    },
  };
};
