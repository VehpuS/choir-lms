// Encodes mono samples as a 16-bit PCM WAV file.
const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;
const INT16_MAX = 0x7fff;
const PCM_FORMAT = 1;
const FMT_CHUNK_BYTES = 16;
const BITS_PER_SAMPLE = 16;

export const encodePcmWav = (
  samples: ArrayLike<number>,
  sampleRate: number,
): Buffer => {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
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

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));

    wav.writeInt16LE(
      Math.round(clamped * INT16_MAX),
      WAV_HEADER_BYTES + index * BYTES_PER_SAMPLE,
    );
  }

  return wav;
};
