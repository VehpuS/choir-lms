import { StyleSheet, View } from 'react-native';

import { ModalSurfaceBase } from './modal-surface-base';
import { SectionHeading } from './section-heading';

import { appTheme } from '../../utils/theme';

type BottomSheetSurfaceProps = {
  children: React.ReactNode;
  eyebrow?: string;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
};

const BACKDROP = appTheme.colors.scrim;
const CARD_BACKGROUND = appTheme.colors.bg;

export const BottomSheetSurface = ({
  children,
  eyebrow,
  isVisible,
  onClose,
  title,
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
          titleNumberOfLines={1}
          titleStyle={styles.title}
        />
      ) : null}
      {children}
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
