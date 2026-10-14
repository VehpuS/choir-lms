import { readMusicXmlText } from './musicxml-text';

export type ScoreOrigin = 'musicxml' | 'midi';

export type ScoreMusicXml = {
  musicXml: string;
  /**
   * Where the staves came from. A `midi` score is an approximation of
   * performance data, which the viewer can say or not; the converter does not
   * decide that.
   */
  origin: ScoreOrigin;
};

type LoadedScore = {
  bytes: Uint8Array;
  format: 'musicxml' | 'midi';
  isCompressed: boolean;
};

/**
 * Turns a loaded MusicXML, `.mxl`, or MIDI source into MusicXML text, so every
 * notated source goes through one renderer and one part filter. MIDI is
 * converted by a lazily loaded module so `@tonejs/midi` stays out of the
 * startup bundle. Returns null when the bytes cannot be read as a score.
 */
export const resolveScoreMusicXml = async (
  score: LoadedScore,
  options: { pickupSixteenths?: number } = {},
): Promise<ScoreMusicXml | null> => {
  if (score.format === 'midi') {
    const { convertMidiToMusicXml } = await import('@org/midi-notation');
    const converted = convertMidiToMusicXml(score.bytes, options);

    return converted ? { musicXml: converted.musicXml, origin: 'midi' } : null;
  }

  const musicXml = await readMusicXmlText(score.bytes, score.isCompressed);

  return musicXml ? { musicXml, origin: 'musicxml' } : null;
};
