import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import {
  THUMBNAIL_LABEL_HEIGHT,
  THUMBNAIL_PAGE_ASPECT,
} from './go-to-page-model';

const MARKED_BORDER_WIDTH = 2;

export type ThumbnailCellProps = {
  cellWidth: number;
  /** The 0-based page. */
  index: number;
  /** Highlighted: the current page, or both pages of the current spread. */
  isMarked: boolean;
  onPress: (index: number) => void;
};

type ThumbnailCellFrameProps = ThumbnailCellProps & {
  /** The picture area; a plain placeholder when absent. */
  children?: React.ReactNode;
};

/** A page's frame in the grid: the picture area and its page number, pressable. */
export const ThumbnailCellFrame = ({
  cellWidth,
  children,
  index,
  isMarked,
  onPress,
}: ThumbnailCellFrameProps) => {
  return (
    <Pressable
      accessibilityLabel={`Page ${index + 1}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isMarked }}
      onPress={() => {
        onPress(index);
      }}
      style={[styles.cell, { width: cellWidth }]}
    >
      <View
        style={[
          styles.picture,
          {
            height: Math.ceil(cellWidth * THUMBNAIL_PAGE_ASPECT),
          },
          isMarked && styles.pictureMarked,
        ]}
      >
        {children}
      </View>
      <Text style={[styles.label, isMarked && styles.labelMarked]}>
        {index + 1}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
  },
  label: {
    ...appTheme.type.rowMeta,
    height: THUMBNAIL_LABEL_HEIGHT,
    color: appTheme.colors.textMuted,
  },
  labelMarked: {
    color: appTheme.colors.accentText,
    fontWeight: '700',
  },
  picture: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: MARKED_BORDER_WIDTH,
    borderColor: 'transparent',
    borderRadius: appTheme.radius.sm,
    backgroundColor: appTheme.colors.surface,
  },
  pictureMarked: {
    borderColor: appTheme.colors.accent,
  },
});
