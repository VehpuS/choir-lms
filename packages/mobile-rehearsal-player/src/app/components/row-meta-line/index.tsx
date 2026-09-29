import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { appTheme } from '../../utils/theme';
import { ROW_META_SEPARATOR, splitRowMetaSegments } from './model';

type RowMetaLineProps = {
  /** Inline status (e.g. `Playing`) set before the first segment and a separator. */
  leading?: ReactNode;
  style?: StyleProp<TextStyle>;
  text: string;
};

// The dim second line of a list row: one line, muted, with durations and
// time ranges set in the mono font so they align down a list.
export const RowMetaLine = ({ leading, style, text }: RowMetaLineProps) => {
  const segments = splitRowMetaSegments(text);

  return (
    <Text numberOfLines={1} style={[styles.meta, style]}>
      {leading ? (
        <>
          {leading}
          {ROW_META_SEPARATOR}
        </>
      ) : null}
      {segments.map((segment, index) => {
        return (
          <Fragment key={index}>
            {index > 0 ? ROW_META_SEPARATOR : null}
            {segment.isTimecode ? (
              <Text style={styles.timecode}>{segment.text}</Text>
            ) : (
              segment.text
            )}
          </Fragment>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  meta: {
    ...appTheme.type.rowMeta,
    lineHeight: 17,
  },
  timecode: {
    fontFamily: appTheme.fontFamily.mono,
    fontSize: 11.5,
  },
});
