import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { CenteredDialogCard } from '../../../../library/components/centered-dialog-card';
import {
  FORGET_SESSION_COPY,
  type ForgetSessionPrompt,
} from '../../../../library/offline/forget-session-prompt';
import { appTheme } from '../../../../utils/theme';

type ForgetSessionDialogProps = {
  isBusy: boolean;
  onCancel: () => void;
  onClear: () => void;
  onKeep: () => void;
  prompt: ForgetSessionPrompt;
};

/** Signing out with offline files: keep them, clear them, or back out. */
export const ForgetSessionDialog = ({
  isBusy,
  onCancel,
  onClear,
  onKeep,
  prompt,
}: ForgetSessionDialogProps) => {
  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.title}>{prompt.title}</Text>
      <Text style={styles.message}>{prompt.message}</Text>
      <View style={styles.actions}>
        <OutlinedActionButton
          disabled={isBusy}
          label={FORGET_SESSION_COPY.keepLabel}
          onPress={onKeep}
          variant="accent"
        />
        <OutlinedActionButton
          disabled={isBusy}
          isBusy={isBusy}
          label={FORGET_SESSION_COPY.clearLabel}
          onPress={onClear}
          variant="destructive"
        />
        <OutlinedActionButton
          disabled={isBusy}
          label={FORGET_SESSION_COPY.cancelLabel}
          onPress={onCancel}
          variant="neutral"
        />
      </View>
    </CenteredDialogCard>
  );
};

const styles = StyleSheet.create({
  actions: {
    gap: appTheme.space.sm,
    paddingTop: appTheme.space.sm,
  },
  message: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
  },
});
