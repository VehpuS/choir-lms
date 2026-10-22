import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';

type MarkerUndoBarProps = {
  markerName: string;
  onUndo: () => void;
};

/** Offered for a few seconds after a deletion, in place of a confirmation. */
export const MarkerUndoBar = ({ markerName, onUndo }: MarkerUndoBarProps) => {
  return (
    <View style={styles.bar}>
      <Text numberOfLines={1} style={styles.text}>
        Deleted {markerName}
      </Text>
      <OutlinedActionButton label="Undo" onPress={onUndo} variant="accent" />
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
    paddingLeft: appTheme.space.sm,
    backgroundColor: appTheme.colors.surface,
  },
  text: {
    ...appTheme.type.body,
    flex: 1,
    color: appTheme.colors.text,
  },
});
