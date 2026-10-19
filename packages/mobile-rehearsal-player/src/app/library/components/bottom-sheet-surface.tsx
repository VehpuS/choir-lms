import { ScrollView, StyleSheet, View } from 'react-native';

import { ModalSurfaceBase } from './modal-surface-base';
import { SectionHeading } from './section-heading';

import { darkScrollbarStyle } from '../../components/dark-scrollbar';
import { appTheme } from '../../utils/theme';

type BottomSheetSurfaceProps = {
  children: React.ReactNode;
  eyebrow?: string;
  isVisible: boolean;
  onClose: () => void;
  /**
   * Scrolls the content under the title when it is taller than the screen. For
   * a sheet whose content has no scroll area of its own; one that has its own
   * (a list, a text field) leaves this off so scrolling is not nested.
   */
  scrollable?: boolean;
  title?: string;
  /** Lines before the title ellipsizes; 0 shows it in full. */
  titleNumberOfLines?: number;
};

const BACKDROP = appTheme.colors.scrim;
const CARD_BACKGROUND = appTheme.colors.bg;

export const BottomSheetSurface = ({
  children,
  eyebrow,
  isVisible,
  onClose,
  scrollable = false,
  title,
  titleNumberOfLines = 1,
}: BottomSheetSurfaceProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <ModalSurfaceBase
      backdropColor={BACKDROP}
      isVisible={isVisible}
      onRequestClose={onClose}
      placement="bottom"
      surfaceStyle={styles.sheet}
    >
      <View style={styles.grabber} />
      {eyebrow || title ? (
        <SectionHeading
          eyebrow={eyebrow}
          style={styles.copyGroup}
          title={title}
          titleNumberOfLines={titleNumberOfLines}
          titleStyle={styles.title}
        />
      ) : null}
      {scrollable ? (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={[darkScrollbarStyle, styles.scroll]}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </ModalSurfaceBase>
  );
};

// Bottom sheet (screens 1f, 1h, 1i): ground-colored, 22pt top radius, a
// centered grabber, and an edge-plus-ambient-darkness elevation.
const GRABBER_WIDTH = 52;
const GRABBER_HEIGHT = 4;
const SHEET_BOTTOM_PADDING = 34;

const styles = StyleSheet.create({
  copyGroup: {
    gap: appTheme.space.xxs,
  },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    marginBottom: appTheme.space.xxs,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.divider,
  },
  // Shrinks under the surface's height cap instead of pushing past the screen.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: appTheme.space.md,
  },
  sheet: {
    ...appTheme.elevation.sheet,
    borderBottomWidth: 0,
    gap: appTheme.space.md,
    paddingHorizontal: appTheme.space.sheetInset,
    paddingTop: appTheme.space.sm,
    paddingBottom: SHEET_BOTTOM_PADDING,
    borderTopLeftRadius: appTheme.radius.sheet,
    borderTopRightRadius: appTheme.radius.sheet,
    backgroundColor: CARD_BACKGROUND,
  },
  title: {
    ...appTheme.type.sheetTitle,
    color: appTheme.colors.text,
  },
});
