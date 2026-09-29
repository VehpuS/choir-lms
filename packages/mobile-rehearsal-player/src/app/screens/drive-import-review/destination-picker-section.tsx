import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { SectionHeading } from '../../library/components/section-heading';
import { appTheme } from '../../utils/theme';
import { getDriveImportReviewDestinationCopy } from './screen-copy';
import type { DriveImportDestinationFolderOption } from './drive-import-review-model';

const { colors, space } = appTheme;

const GLYPH_SIZE = 20;
const PRESSED_OPACITY = 0.7;

type DestinationPickerSectionProps = {
  destinationFolders: readonly DriveImportDestinationFolderOption[];
  onSelectDestination: (folderId: string) => void;
  selectedFolderId: string | null;
};

// Destination folders as 1e rows under a kicker: folder glyph and path label,
// with the chosen row marked by an accent check and accent title (a radio
// group, so the state is also announced, never color alone).
export const DestinationPickerSection = ({
  destinationFolders,
  onSelectDestination,
  selectedFolderId,
}: DestinationPickerSectionProps) => {
  const copy = getDriveImportReviewDestinationCopy();

  return (
    <View style={styles.section}>
      <SectionHeading eyebrow={copy.title} />
      {destinationFolders.length === 0 ? (
        <Text style={styles.helper}>{copy.emptyHelper}</Text>
      ) : (
        <View accessibilityLabel={copy.title} accessibilityRole="radiogroup">
          {destinationFolders.map(({ folder, label }, index) => {
            const isSelected = folder.id === selectedFolderId;

            return (
              <Fragment key={folder.id}>
                {index > 0 ? <View style={styles.separator} /> : null}
                {/* `aria-checked` rather than `accessibilityState`, which
                    react-native-web drops (8.15); React Native reads it natively. */}
                <Pressable
                  accessibilityRole="radio"
                  aria-checked={isSelected}
                  onPress={() => onSelectDestination(folder.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed ? styles.rowPressed : undefined,
                  ]}
                >
                  <AppIcon
                    color={colors.icon}
                    name="folder-outline"
                    size={GLYPH_SIZE}
                  />
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.rowLabel,
                      isSelected ? styles.rowLabelSelected : undefined,
                    ]}
                  >
                    {label}
                  </Text>
                  {isSelected ? (
                    <AppIcon
                      color={colors.accent}
                      name="check-circle"
                      size={GLYPH_SIZE}
                    />
                  ) : null}
                </Pressable>
              </Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  helper: {
    ...appTheme.type.body,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: space.touchTarget,
    paddingVertical: space.xs,
  },
  rowLabel: {
    ...appTheme.type.rowTitle,
    flex: 1,
    color: colors.text,
  },
  rowLabelSelected: {
    color: colors.accentText,
  },
  rowPressed: {
    opacity: PRESSED_OPACITY,
  },
  section: {
    gap: space.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});
