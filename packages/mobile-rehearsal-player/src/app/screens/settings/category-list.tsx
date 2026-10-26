import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { buttonInteractionGuardStyle } from '../../components/interaction-guard';
import { appTheme } from '../../utils/theme';
import type { SettingsCategory } from './model';

const CHEVRON_SIZE = 18;
const MIN_ROW_HEIGHT = 56;

type CategoryListProps = {
  categories: readonly SettingsCategory[];
  onSelect: (category: SettingsCategory) => void;
};

/** The top level of Settings: one row per category, each opening its page. */
export const CategoryList = ({ categories, onSelect }: CategoryListProps) => {
  return (
    <View style={styles.list}>
      {categories.map((category) => (
        <Pressable
          accessibilityLabel={category.title}
          accessibilityRole="button"
          key={category.key}
          onPress={() => {
            onSelect(category);
          }}
          style={({ pressed }) => [
            styles.row,
            buttonInteractionGuardStyle,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.text}>
            <Text style={styles.title}>{category.title}</Text>
            <Text style={styles.summary}>{category.summary}</Text>
          </View>
          <AppIcon
            color={appTheme.colors.icon}
            name="chevron-right"
            size={CHEVRON_SIZE}
          />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: appTheme.space.xs,
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
  summary: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
  },
});
