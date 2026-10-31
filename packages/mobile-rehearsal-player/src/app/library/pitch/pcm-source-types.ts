/** One frame of mono microphone samples, as delivered to every subscriber. */
export type PcmFrame = {
  samples: Float32Array;
  sampleRate: number;
  /**
   * Capture time in seconds of the frame's last sample, on the audio context
   * clock where the platform has one (so a later recorder can align takes to
   * playback). Pitch detection only needs it to be monotonic.
   */
  captureTimeSec: number;
};

/**
 * A contiguous run of mono samples straight from capture: unlike frames,
 * consecutive blocks never overlap, so a recorder can concatenate them.
 * Subscribers must not modify `samples`; they are shared between them.
 */
export type PcmBlock = {
  samples: Float32Array;
  sampleRate: number;
  /** Capture time in seconds of the block's first sample, on the audio context clock. */
  startTimeSec: number;
};

export type PcmPermission = 'unknown' | 'prompt' | 'granted' | 'denied';

export type PcmSourceFailure = 'denied' | 'unavailable' | 'in-use';

export class PcmSourceError extends Error {
  readonly reason: PcmSourceFailure;

  constructor(reason: PcmSourceFailure) {
    super(`Microphone ${reason}`);
    this.name = 'PcmSourceError';
    this.reason = reason;
  }
}

export type PcmSubscriber = {
  /** Overlapping analysis frames; the frame assembler runs only while someone wants these. */
  onFrame?: (frame: PcmFrame) => void;
  /** Contiguous blocks for recording (rehearsal-recording design Decision 1). */
  onBlock?: (block: PcmBlock) => void;
  /** Capture is paused by the system (a call, another app) and may recover. */
  onInterrupted?: () => void;
  onRecovered?: () => void;
  /** Capture ended for good; the subscriber must subscribe again. */
  onEnded?: () => void;
};

/**
 * The shared microphone. Several subscribers (pitch detection and the
 * recorder) can listen at once over one stream: it opens when the first
 * subscribes and closes after the last leaves. Audio is unprocessed (no echo
 * cancellation, noise suppression or gain control). Nothing here stores audio.
 */
export type PcmSource = {
  queryPermission: () => Promise<PcmPermission>;
  /** Rejects with a `PcmSourceError` when the microphone cannot be opened. */
  subscribe: (subscriber: PcmSubscriber) => Promise<() => void>;
};
