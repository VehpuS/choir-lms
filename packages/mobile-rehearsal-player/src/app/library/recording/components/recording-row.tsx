import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import {
  resolveExplorerRowSelection,
  type ExplorerRowSelection,
} from '../../components/explorer/model';
import type { RecordingRow as RecordingRowModel } from '../recordings-panel-model';

const { colors, radius, space, type } = appTheme;

type RecordingRowProps = {
  row: RecordingRowModel;
  /** The Library view names the track first, since its rows are not under one. */
  trackName?: string;
  /** `On Drive`, `Upload pending`, `Upload failed`; absent when never exported. */
  driveLabel?: string;
  /** Shown as a `Retry` beside the options when the upload failed. */
  onRetryDrive?: (id: string) => void;
  /** Selection wiring from the Library view; in selection mode a tap toggles. */
  selection?: ExplorerRowSelection;
  onOpenMenu: (id: string) => void;
  /** A tap on the row plays the recording; the options button opens its menu. */
  onPlay: (id: string) => void;
};

/** One recording in a list: name and tags, span and size, when and how it was shaped. */
export const RecordingRow = ({
  driveLabel,
  onOpenMenu,
  onPlay,
  onRetryDrive,
  row,
  selection,
  trackName,
}: RecordingRowProps) => {
  const resolved = resolveExplorerRowSelection(selection, () => onPlay(row.id));

  return (
    <View style={styles.row}>
      {resolved.glyph ? (
        <AppIcon
          color={resolved.glyph.color}
          name={resolved.glyph.name}
          size={22}
        />
      ) : null}
      <Pressable
        accessibilityHint={
          resolved.onLongPress || !selection?.isActive
            ? 'Plays this recording'
            : 'Toggles selection'
        }
        accessibilityLabel={`${row.name}. ${row.detail}`}
        accessibilityRole={resolved.role}
        aria-checked={resolved.ariaChecked}
        {...interactionGuardProps}
        onLongPress={resolved.onLongPress}
        onPress={resolved.onPress}
        style={({ pressed }) => [
          styles.text,
          buttonInteractionGuardStyle,
          pressed ? styles.pressed : null,
        ]}
      >
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
          {trackName ? `${trackName} · ${row.detail}` : row.detail}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {driveLabel ? `${row.meta} · ${driveLabel}` : row.meta}
        </Text>
      </Pressable>
      {onRetryDrive && !resolved.hidesTrailingControls ? (
        <Pressable
          accessibilityLabel={`Retry upload for ${row.name}`}
          accessibilityRole="button"
          {...interactionGuardProps}
          onPress={() => onRetryDrive(row.id)}
          style={({ pressed }) => [
            styles.retry,
            buttonInteractionGuardStyle,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      ) : null}
      {resolved.hidesTrailingControls ? null : (
        <Pressable
          accessibilityLabel={`Options for ${row.name}`}
          accessibilityRole="button"
          {...interactionGuardProps}
          onPress={() => onOpenMenu(row.id)}
          style={({ pressed }) => [
            styles.options,
            buttonInteractionGuardStyle,
            pressed ? styles.pressed : null,
          ]}
        >
          <AppIcon color={colors.textMuted} name="dots-vertical" size={20} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  retry: {
    minHeight: space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  retryLabel: { ...type.rowMeta, color: colors.accent },
  meta: { ...type.rowMeta, color: colors.textMuted },
  name: { ...type.rowTitle, color: colors.text, flexShrink: 1 },
  options: {
    width: space.touchTarget,
    height: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
