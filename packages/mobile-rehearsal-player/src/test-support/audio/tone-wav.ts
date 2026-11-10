// A generated tone as a WAV file, for browser scenarios that need audio of a
// known length and pitch without a committed binary (a ten-minute track is just
// `seconds: 600`). Mono, 16-bit PCM.
const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;
const DEFAULT_SAMPLE_RATE = 22_050;
const DEFAULT_HZ = 440;
// Quiet enough to be safe if it ever reaches speakers, loud enough to measure.
const DEFAULT_AMPLITUDE = 0.5;
const INT16_MAX = 0x7fff;
const PCM_FORMAT = 1;
const FMT_CHUNK_BYTES = 16;
const BITS_PER_SAMPLE = 16;

export type ToneWavOptions = {
  /** 0 to 1 of full scale. */
  amplitude?: number;
  hz?: number;
  sampleRate?: number;
  seconds: number;
};

export const buildToneWav = (options: ToneWavOptions): Buffer => {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const hz = options.hz ?? DEFAULT_HZ;
  const amplitude = options.amplitude ?? DEFAULT_AMPLITUDE;
  const sampleCount = Math.round(options.seconds * sampleRate);
  const dataBytes = sampleCount * BYTES_PER_SAMPLE;
  const wav = Buffer.alloc(WAV_HEADER_BYTES + dataBytes);

  wav.write('RIFF', 0, 'latin1');
  wav.writeUInt32LE(WAV_HEADER_BYTES - 8 + dataBytes, 4);
  wav.write('WAVEfmt ', 8, 'latin1');
  wav.writeUInt32LE(FMT_CHUNK_BYTES, 16);
  wav.writeUInt16LE(PCM_FORMAT, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * BYTES_PER_SAMPLE, 28);
  wav.writeUInt16LE(BYTES_PER_SAMPLE, 32);
  wav.writeUInt16LE(BITS_PER_SAMPLE, 34);
  wav.write('data', 36, 'latin1');
  wav.writeUInt32LE(dataBytes, 40);

  const angularStep = (2 * Math.PI * hz) / sampleRate;

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(
      Math.sin(angularStep * index) * amplitude * INT16_MAX,
    );

    wav.writeInt16LE(sample, WAV_HEADER_BYTES + index * BYTES_PER_SAMPLE);
  }

  return wav;
};
