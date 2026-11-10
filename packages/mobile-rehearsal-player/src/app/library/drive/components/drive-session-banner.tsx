import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { resolveFeedbackCardPalette } from '../../components/feedback-card-model';
import type { DriveSessionBannerCopy } from '../utils/drive-access-copy';

type DriveSessionBannerProps = {
  copy: DriveSessionBannerCopy;
  /** Hidden when the session cannot start authorization right now. */
  onPressAction?: () => void;
  isBusy?: boolean;
};

const ICON_SIZE = 18;

// One line: icon, title and a single action. It replaces a per-row message
// because a disconnected session is one fault, not one per track.
export const DriveSessionBanner = ({
  copy,
  isBusy = false,
  onPressAction,
}: DriveSessionBannerProps) => {
  const palette = resolveFeedbackCardPalette(copy.tone);

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        { backgroundColor: palette.surface, borderColor: palette.edge },
      ]}
    >
      <AppIcon color={palette.title} name="cloud-slash" size={ICON_SIZE} />
      <Text numberOfLines={1} style={[styles.title, { color: palette.title }]}>
        {copy.title}
      </Text>
      {onPressAction ? (
        <OutlinedActionButton
          isBusy={isBusy}
          label={copy.actionLabel}
          onPress={onPressAction}
          variant="accent"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: appTheme.space.sm,
    paddingHorizontal: appTheme.space.md,
    paddingVertical: appTheme.space.sm,
  },
  title: {
    ...appTheme.type.body,
    flex: 1,
    fontWeight: '600',
  },
});
