import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import type { AllowSavingStep as AllowSavingStepModel } from './allow-saving-step-model';

type AllowSavingStepProps = {
  isBusy: boolean;
  onAllow: () => void;
  step: Exclude<AllowSavingStepModel, { state: 'ready' }>;
};

/** Asks for the Drive write permission; a tap starts the Google sign-in again. */
export const AllowSavingStep = ({
  isBusy,
  onAllow,
  step,
}: AllowSavingStepProps) => {
  return (
    <View style={styles.step}>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.message}>{step.message}</Text>
      <OutlinedActionButton
        accessibilityLabel={step.actionLabel}
        disabled={isBusy}
        isBusy={isBusy}
        label={step.actionLabel}
        onPress={onAllow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  message: {
    ...appTheme.type.body,
    color: appTheme.colors.textSecondary,
  },
  step: {
    alignItems: 'flex-start',
    gap: appTheme.space.sm,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
