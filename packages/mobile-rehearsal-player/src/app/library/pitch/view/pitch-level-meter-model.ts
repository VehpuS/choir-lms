import {
  clampLevelCutoffDb,
  MAX_LEVEL_CUTOFF_DB,
  MIN_LEVEL_CUTOFF_DB,
} from '@org/pitch-detection';

/** What the meter draws: a little beyond the range the cutoff can take. */
export const METER_MIN_DB = MIN_LEVEL_CUTOFF_DB - 10;
export const METER_MAX_DB = MAX_LEVEL_CUTOFF_DB + 10;
export const CUTOFF_STEP_DB = 2;

const METER_SPAN_DB = METER_MAX_DB - METER_MIN_DB;
const TRUE_MINUS = '−';

/** Where a level sits along the meter, 0 (left) to 1 (right). */
export const dbToMeterRatio = (db: number): number =>
  Math.min(1, Math.max(0, (db - METER_MIN_DB) / METER_SPAN_DB));

/** The cutoff nearest a position along the meter, on the 2 dB grid and in range. */
export const meterRatioToCutoffDb = (ratio: number): number => {
  const raw = METER_MIN_DB + ratio * METER_SPAN_DB;

  return clampLevelCutoffDb(Math.round(raw / CUTOFF_STEP_DB) * CUTOFF_STEP_DB);
};

/** A drag of `deltaRatio` of the meter's width from where it began. */
export const dragCutoffDb = (startDb: number, deltaRatio: number): number =>
  meterRatioToCutoffDb(dbToMeterRatio(startDb) + deltaRatio);

export const stepCutoffDb = (
  cutoffDb: number,
  direction: 'quieter' | 'louder',
): number =>
  clampLevelCutoffDb(
    cutoffDb + (direction === 'louder' ? CUTOFF_STEP_DB : -CUTOFF_STEP_DB),
  );

/** `−40 dB`, with a true minus sign like the rest of the pitch copy. */
export const formatDb = (db: number): string =>
  `${db < 0 ? TRUE_MINUS : ''}${Math.abs(Math.round(db))} dB`;

export type LevelMeterModel = {
  /** Fill of the level bar (0..1); empty while not listening. */
  levelRatio: number;
  cutoffRatio: number;
  /** The level is over the cutoff, so a voice would be heard. */
  isHeard: boolean;
  valueText: string;
  /** Shown instead of the level while capture is off. */
  hintText: string | null;
  canQuieter: boolean;
  canLouder: boolean;
};

export const getLevelMeterModel = ({
  cutoffDb,
  levelDb,
  isListening,
}: {
  cutoffDb: number;
  levelDb: number;
  isListening: boolean;
}): LevelMeterModel => ({
  levelRatio: isListening ? dbToMeterRatio(levelDb) : 0,
  cutoffRatio: dbToMeterRatio(cutoffDb),
  isHeard: isListening && levelDb >= cutoffDb,
  valueText: formatDb(cutoffDb),
  hintText: isListening ? null : 'Start listening to see the level',
  canQuieter: cutoffDb > MIN_LEVEL_CUTOFF_DB,
  canLouder: cutoffDb < MAX_LEVEL_CUTOFF_DB,
});
