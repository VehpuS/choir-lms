/** Joins the parts of a row meta line (README "Row anatomy"). */
export const ROW_META_SEPARATOR = ' · ';

// Meta strings built before the Nocturne pass join with a bullet; both
// separators split into the same segments.
const ROW_META_SEPARATOR_PATTERN = / [·•] /;

// A duration (`4:38`, `1:02:15`) or a range of two (`1:12–1:48`).
const TIMECODE_PATTERN = /^\d+(?::\d{2}){1,2}(?:[–-]\d+(?::\d{2}){1,2})?$/;

export type RowMetaSegment = {
  isTimecode: boolean;
  text: string;
};

export const splitRowMetaSegments = (text: string): RowMetaSegment[] => {
  return text
    .split(ROW_META_SEPARATOR_PATTERN)
    .filter((part) => part.length > 0)
    .map((part) => {
      return { isTimecode: TIMECODE_PATTERN.test(part), text: part };
    });
};
