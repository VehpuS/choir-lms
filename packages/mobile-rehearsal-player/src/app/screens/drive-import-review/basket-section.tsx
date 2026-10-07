import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import type { DriveBasketGroup } from '../../library/drive/utils/drive-basket-model';
import { SectionHeading } from '../../library/components/section-heading';
import { appTheme } from '../../utils/theme';
import { getDriveImportReviewBasketCopy } from './screen-copy';

const { colors, space } = appTheme;

const GLYPH_SIZE = 20;
const REMOVE_ICON_SIZE = 16;

type BasketSectionProps = {
  groups: readonly DriveBasketGroup[];
  onRemove: (resultId: string) => void;
};

// The basket as the review's first section (design: "Basket view"): the
// selection ordered by root, each row showing its Drive path (which starts
// with the root, so the groups need no heading of their own), with a button
// to take one item out. It reuses the review's row anatomy rather than a new
// surface; the import plan below recomputes as items leave.
export const BasketSection = ({ groups, onRemove }: BasketSectionProps) => {
  const copy = getDriveImportReviewBasketCopy();

  return (
    <View style={styles.section}>
      <SectionHeading eyebrow={copy.title} />
      {groups.map((group) => (
        <View key={group.rootKind}>
          {group.entries.map(({ pathLabel, result }, index) => (
            <Fragment key={result.id}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <View style={styles.row}>
                <AppIcon
                  color={colors.icon}
                  name={
                    result.kind === 'folder'
                      ? 'folder-outline'
                      : 'music-note-outline'
                  }
                  size={GLYPH_SIZE}
                />
                <View style={styles.rowCopy}>
                  <Text numberOfLines={2} style={styles.rowTitle}>
                    {result.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowPath}>
                    {pathLabel}
                  </Text>
                </View>
                <SurfaceIconButton
                  accessibilityLabel={copy.getRemoveLabel(result.name)}
                  icon="close"
                  onPress={() => onRemove(result.id)}
                  size={REMOVE_ICON_SIZE}
                />
              </View>
            </Fragment>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: space.touchTarget,
    paddingVertical: space.xs,
  },
  rowCopy: {
    flex: 1,
    gap: space.xxs,
  },
  rowPath: {
    ...appTheme.type.body,
    color: colors.textFaint,
  },
  rowTitle: {
    ...appTheme.type.rowTitle,
    color: colors.text,
  },
  section: {
    gap: space.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});
