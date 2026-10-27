import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { buttonInteractionGuardStyle } from '../../components/interaction-guard';
import { ariaStateProps } from '../../components/aria-state';
import { formatByteSize } from '../../library/offline/format-byte-size';
import type { OfflineFileRow } from '../../library/offline/offline-storage-model';
import { appTheme } from '../../utils/theme';

const ICON_SIZE = 22;
const MIN_ROW_HEIGHT = 56;

type OfflineFileRowViewProps = {
  isSelected: boolean;
  isSelecting: boolean;
  onEnterSelection: () => void;
  onToggle: () => void;
  row: OfflineFileRow;
};

/** One stored file: a name, a size, and a selection mark while selecting. */
export const OfflineFileRowView = ({
  isSelected,
  isSelecting,
  onEnterSelection,
  onToggle,
  row,
}: OfflineFileRowViewProps) => {
  return (
    <View>
      <Pressable
        accessibilityLabel={`${row.name}, ${formatByteSize(row.sizeBytes)}`}
        accessibilityRole={isSelecting ? 'checkbox' : 'button'}
        {...ariaStateProps(
          isSelecting ? { checked: isSelected } : undefined,
          'checkbox',
        )}
        onLongPress={onEnterSelection}
        onPress={isSelecting ? onToggle : onEnterSelection}
        style={({ pressed }) => [
          styles.row,
          buttonInteractionGuardStyle,
          pressed ? styles.pressed : null,
        ]}
      >
        {isSelecting ? (
          <AppIcon
            color={
              isSelected ? appTheme.colors.accentText : appTheme.colors.icon
            }
            name={isSelected ? 'check-circle' : 'circle-outline'}
            size={ICON_SIZE}
          />
        ) : null}
        <Text numberOfLines={1} style={styles.name}>
          {row.name}
        </Text>
        <Text style={styles.size}>{formatByteSize(row.sizeBytes)}</Text>
      </Pressable>
      {row.scores?.map((score) => (
        <View
          accessibilityLabel={`${score.name}, ${formatByteSize(score.sizeBytes)}`}
          accessible
          key={score.driveFileId}
          style={styles.scoreRow}
        >
          <Text numberOfLines={1} style={styles.scoreName}>
            {score.name}
          </Text>
          <Text style={styles.size}>{formatByteSize(score.sizeBytes)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  name: {
    color: appTheme.colors.text,
    flex: 1,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: appTheme.colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: appTheme.space.md,
    minHeight: MIN_ROW_HEIGHT,
    paddingVertical: appTheme.space.sm,
  },
  scoreName: {
    color: appTheme.colors.textMuted,
    flex: 1,
    fontSize: 14,
  },
  scoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.md,
    minHeight: 36,
    paddingLeft: appTheme.space.lg,
  },
  size: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
  },
});
