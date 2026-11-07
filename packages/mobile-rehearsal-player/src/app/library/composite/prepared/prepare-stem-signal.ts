/** Decoded audio as the browser hands it over: one array per channel. */
export type DecodedStem = {
  channels: readonly Float32Array[];
  sampleRate: number;
};

/** Averages the channels into one. A mono stem is returned as it is. */
export const mixDownToMono = (
  channels: readonly Float32Array[],
): Float32Array => {
  const [first, ...rest] = channels;

  if (!first) {
    return new Float32Array(0);
  }

  if (rest.length === 0) {
    return first;
  }

  const length = channels.reduce(
    (shortest, channel) => Math.min(shortest, channel.length),
    first.length,
  );
  const mono = new Float32Array(length);

  for (const channel of channels) {
    for (let index = 0; index < length; index += 1) {
      mono[index] += channel[index];
    }
  }

  for (let index = 0; index < length; index += 1) {
    mono[index] /= channels.length;
  }

  return mono;
};

/**
 * Linear-interpolation resampling. The browser already decodes at the context
 * rate, so this is the safety net for a decoder that does not; voices are band
 * limited and a rate change of this kind is inaudible at rehearsal quality.
 */
export const resampleLinear = (
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array => {
  if (fromRate === toRate || samples.length === 0) {
    return samples;
  }

  const ratio = fromRate / toRate;
  const outLength = Math.round(samples.length / ratio);
  const out = new Float32Array(outLength);
  const last = samples.length - 1;

  for (let index = 0; index < outLength; index += 1) {
    const position = index * ratio;
    const before = Math.min(last, Math.floor(position));
    const after = Math.min(last, before + 1);
    const fraction = position - before;

    out[index] = samples[before] * (1 - fraction) + samples[after] * fraction;
  }

  return out;
};
