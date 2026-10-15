import type { SheetMusicSource } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import {
  VIEWER_ACTION_LABELS,
  resolveExternalActionLabel,
  type ViewerFailure,
  type ViewerFailureAction,
} from './model';

type FailureCardProps = {
  failure: ViewerFailure;
  onAction: (action: ViewerFailureAction) => void;
  source: SheetMusicSource;
};

/** A source that did not open: what happened, and what to do about it. */
export const FailureCard = ({
  failure,
  onAction,
  source,
}: FailureCardProps) => {
  return (
    <View accessibilityRole="alert" style={styles.card}>
      <Text style={styles.title}>{failure.title}</Text>
      <Text style={styles.message}>{failure.message}</Text>
      <View style={styles.actions}>
        {failure.actions.map((action) => (
          <OutlinedActionButton
            icon={action === 'open-external' ? 'open-in-new' : undefined}
            key={action}
            label={
              action === 'open-external'
                ? resolveExternalActionLabel(source)
                : VIEWER_ACTION_LABELS[action]
            }
            onPress={() => onAction(action)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.sm,
    marginTop: appTheme.space.sm,
  },
  card: {
    gap: appTheme.space.sm,
    padding: appTheme.space.lg,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
  },
  message: {
    ...appTheme.type.body,
    color: appTheme.colors.textSecondary,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
