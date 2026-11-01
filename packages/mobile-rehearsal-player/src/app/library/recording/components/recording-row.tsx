import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import type { RecordingRow as RecordingRowModel } from '../recordings-panel-model';

const { colors, radius, space, type } = appTheme;

type RecordingRowProps = {
  row: RecordingRowModel;
  onOpenMenu: (id: string) => void;
};

/** One recording in a list: name and tags, span and size, when and how it was shaped. */
export const RecordingRow = ({ row, onOpenMenu }: RecordingRowProps) => (
  <Pressable
    accessibilityLabel={`${row.name}. ${row.detail}`}
    accessibilityRole="button"
    {...interactionGuardProps}
    onPress={() => onOpenMenu(row.id)}
    style={({ pressed }) => [
      styles.row,
      buttonInteractionGuardStyle,
      pressed ? styles.pressed : null,
    ]}
  >
    <View style={styles.text}>
      <View style={styles.titleLine}>
        <Text numberOfLines={1} style={styles.name}>
          {row.name}
        </Text>
        {row.tags.map((tag) => (
          <Text
            key={`${tag.kind}-${tag.label}`}
            style={[
              styles.tag,
              tag.kind === 'changed' || tag.kind === 'connection'
                ? styles.tagWarning
                : null,
            ]}
          >
            {tag.label}
          </Text>
        ))}
      </View>
      <Text numberOfLines={1} style={styles.meta}>
        {row.detail}
      </Text>
      <Text numberOfLines={1} style={styles.meta}>
        {row.meta}
      </Text>
    </View>
    <AppIcon color={colors.textMuted} name="dots-vertical" size={20} />
  </Pressable>
);

const styles = StyleSheet.create({
  meta: { ...type.rowMeta, color: colors.textMuted },
  name: { ...type.rowTitle, color: colors.text, flexShrink: 1 },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: space.touchTarget,
    paddingVertical: space.xs,
  },
  tag: {
    ...type.rowMeta,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.xs,
  },
  tagWarning: { color: colors.warning },
  text: { flex: 1, gap: 2 },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xxs,
  },
});
