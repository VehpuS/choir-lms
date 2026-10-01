import { StyleSheet, View } from 'react-native';

import { ExplorerListSurface } from '../../components/explorer/index';
import { appTheme } from '../../../utils/theme';

const SKELETON_ROW_COUNT = 4;
const SKELETON_ROW_KEYS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => `loading-row-${index}`,
);
const GLYPH_SIZE = 24;
const TITLE_WIDTHS = ['62%', '48%', '70%', '55%'] as const;
const TITLE_HEIGHT = 14;
const META_HEIGHT = 10;
const META_WIDTH = '34%';

/**
 * Placeholder rows shown inside the list region while a Drive location loads
 * (design Decision 13). Static on purpose: it takes the place of the rows that
 * are coming, so nothing above or below it moves, and it needs no motion
 * preference handling. Hidden from assistive tech; the list region announces
 * the busy state instead.
 */
export const DriveExplorerLoadingRows = () => {
  return (
    <ExplorerListSurface>
      {SKELETON_ROW_KEYS.map((key, index) => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          key={key}
          style={styles.row}
          testID="drive-explorer-loading-row"
        >
          <View style={styles.glyph} />
          <View style={styles.copy}>
            <View
              style={[
                styles.titleBar,
                { width: TITLE_WIDTHS[index % TITLE_WIDTHS.length] },
              ]}
            />
            <View style={styles.metaBar} />
          </View>
        </View>
      ))}
    </ExplorerListSurface>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
    paddingVertical: appTheme.space.sm,
  },
  glyph: {
    width: GLYPH_SIZE,
    height: GLYPH_SIZE,
    borderRadius: appTheme.radius.sm,
    backgroundColor: appTheme.colors.neutral[700],
  },
  copy: {
    flex: 1,
    gap: appTheme.space.xs,
  },
  titleBar: {
    height: TITLE_HEIGHT,
    borderRadius: appTheme.radius.sm,
    backgroundColor: appTheme.colors.neutral[700],
  },
  metaBar: {
    width: META_WIDTH,
    height: META_HEIGHT,
    borderRadius: appTheme.radius.sm,
    backgroundColor: appTheme.colors.neutral[800],
  },
});
