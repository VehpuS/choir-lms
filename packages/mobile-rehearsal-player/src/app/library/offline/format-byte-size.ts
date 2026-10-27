const BYTES_PER_UNIT = 1024;
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
/** One decimal reads well for small figures; larger ones are rounded. */
const DECIMALS_BELOW = 10;

/**
 * A size in binary units: `3.2 MB`, `793 KB`, `212 MB`. Never a bare byte
 * count above 1023, so sizes read the same everywhere they appear.
 */
export const formatByteSize = (bytes: number): string => {
  let value = Math.max(0, bytes);
  let unitIndex = 0;

  while (value >= BYTES_PER_UNIT && unitIndex < UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(value)} ${UNITS[0]}`;
  }

  const text =
    value < DECIMALS_BELOW ? value.toFixed(1) : Math.round(value).toString();

  return `${text} ${UNITS[unitIndex]}`;
};

const TRAILING_ZERO_DECIMAL_PATTERN = /\.0(?= )/;

/** A whole-unit size for a preset choice: `250 MB`, `1 GB`, never `1.0 GB`. */
export const formatPresetSize = (bytes: number): string => {
  return formatByteSize(bytes).replace(TRAILING_ZERO_DECIMAL_PATTERN, '');
};
