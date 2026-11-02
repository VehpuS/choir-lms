import type { TrackStretcher } from './mix-renderer.ts';
import type { PcmWindowReader } from './wav-window-reader.ts';

/** 1 kHz output, so one frame is one millisecond. */
export const OUTPUT_RATE = 1000;

type OpenRequest = Parameters<TrackStretcher['open']>[0];

/**
 * A synthetic track: a sine of the track position (so it shows where the
 * render read and at what rate and pitch) or a constant level.
 */
export const createStretcher = (
  options: {
    channels?: number;
    constant?: number;
    sessionRate?: number;
    failAfterOpens?: number;
  } = {},
) => {
  const opened: OpenRequest[] = [];
  let closed = 0;
  const stretcher: TrackStretcher = {
    channels: options.channels ?? 1,
    open: async (request) => {
      if (
        options.failAfterOpens !== undefined &&
        opened.length >= options.failAfterOpens
      ) {
        throw new Error('track unavailable');
      }

      opened.push(request);

      let played = 0;

      return {
        close: () => {
          closed += 1;
        },
        read: async (frames) => {
          const channels = Array.from(
            { length: options.channels ?? 1 },
            () => new Float32Array(frames),
          );

          for (let frame = 0; frame < frames; frame += 1) {
            const trackSeconds =
              (request.trackStartMs + (played + frame) * request.rate) / 1000;
            const hertz = 3 * 2 ** (request.pitchSemitones / 12);
            const value =
              options.constant ??
              0.5 * Math.sin(2 * Math.PI * hertz * trackSeconds);

            channels.forEach((channel) => {
              channel[frame] = value;
            });
          }

          played += frames;

          return channels;
        },
      };
    },
    sampleRate: OUTPUT_RATE,
  };

  return { closed: () => closed, opened, stretcher };
};

/** A recording whose sample at index `i` is `valueAt(i)`. */
export const createReader = (
  sampleCount: number,
  valueAt: (index: number) => number,
  sampleRate = OUTPUT_RATE,
): PcmWindowReader => ({
  durationMs: (sampleCount * 1000) / sampleRate,
  read: async (start, count) => {
    const end = Math.min(sampleCount, start + count);

    return Float32Array.from({ length: Math.max(0, end - start) }, (_, i) =>
      valueAt(start + i),
    );
  },
  sampleCount,
  sampleRate,
});
