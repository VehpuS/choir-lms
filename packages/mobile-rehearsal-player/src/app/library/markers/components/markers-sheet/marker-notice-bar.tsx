import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';

type MarkerNoticeBarProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
};

/**
 * A short confirmation with one follow-up action: `Undo` after a deletion (in
 * place of a confirmation dialog), `Rename` after an add.
 */
export const MarkerNoticeBar = ({
  actionLabel,
  message,
  onAction,
}: MarkerNoticeBarProps) => {
  return (
    <View style={styles.bar}>
      <Text numberOfLines={1} style={styles.text}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <OutlinedActionButton
          label={actionLabel}
          onPress={onAction}
          variant="accent"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderButton,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
    backgroundColor: appTheme.colors.surface,
  },
  text: {
    ...appTheme.type.body,
    flex: 1,
    color: appTheme.colors.text,
  },
});
