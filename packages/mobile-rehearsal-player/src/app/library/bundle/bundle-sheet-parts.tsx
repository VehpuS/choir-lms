import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '../../components/app-icon';
import { appTheme } from '../../utils/theme';
import type { CountTile, PhaseLine } from './bundle-flow-model';

/** Small presentational pieces the bundle sheets share; they hold no state or wording of their own. */

export const CountTiles = ({ tiles }: { tiles: readonly CountTile[] }) => (
  <View style={styles.tiles}>
    {tiles.map((tile) => (
      <View key={tile.label} style={styles.tile}>
        <Text
          style={[
            styles.tileValue,
            tile.tone === 'ok' ? styles.toneOk : undefined,
            tile.tone === 'warn' ? styles.toneWarn : undefined,
          ]}
        >
          {tile.value}
        </Text>
        <Text style={styles.tileLabel}>{tile.label}</Text>
      </View>
    ))}
  </View>
);

type ChoiceRowProps = {
  checked: boolean;
  detail?: string;
  kind: 'checkbox' | 'radio';
  onPress: () => void;
  title: string;
};

/** A checkbox or radio row; nothing is checked until the user chooses. */
export const ChoiceRow = ({
  checked,
  detail,
  kind,
  onPress,
  title,
}: ChoiceRowProps) => (
  <Pressable
    accessibilityLabel={title}
    accessibilityRole={kind}
    accessibilityState={{ checked }}
    onPress={onPress}
    style={[styles.choice, checked ? styles.choiceChecked : undefined]}
  >
    <View
      style={[
        kind === 'radio' ? styles.radio : styles.checkbox,
        checked ? styles.markChecked : undefined,
      ]}
    >
      {checked ? (
        <AppIcon
          color={appTheme.colors.bg}
          name={kind === 'radio' ? 'check' : 'check'}
          size={12}
        />
      ) : null}
    </View>
    <View style={styles.choiceCopy}>
      <Text style={styles.choiceTitle}>{title}</Text>
      {detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}
    </View>
  </Pressable>
);

type ListRowProps = {
  icon: AppIconName;
  meta?: string;
  onPress: () => void;
  tag?: string;
  title: string;
};

export const ListRow = ({ icon, meta, onPress, tag, title }: ListRowProps) => (
  <Pressable
    accessibilityLabel={meta ? `${title}, ${meta}` : title}
    accessibilityRole="button"
    onPress={onPress}
    style={styles.listRow}
  >
    <View style={styles.listIcon}>
      <AppIcon color={appTheme.colors.icon} name={icon} size={18} />
    </View>
    <View style={styles.choiceCopy}>
      <Text numberOfLines={1} style={styles.choiceTitle}>
        {title}
      </Text>
      {meta ? (
        <Text numberOfLines={1} style={styles.choiceDetail}>
          {meta}
        </Text>
      ) : null}
    </View>
    {tag ? <Text style={styles.tag}>{tag}</Text> : null}
  </Pressable>
);

export const PhaseList = ({ lines }: { lines: readonly PhaseLine[] }) => (
  <View style={styles.phases}>
    {lines.map((line) => (
      <View key={line.label} style={styles.phase}>
        <View
          style={[
            styles.phaseDot,
            line.state === 'done' ? styles.phaseDone : undefined,
            line.state === 'now' ? styles.phaseNow : undefined,
          ]}
        />
        <Text
          style={[
            styles.phaseLabel,
            line.state === 'now' ? styles.phaseLabelNow : undefined,
          ]}
        >
          {line.label}
        </Text>
      </View>
    ))}
  </View>
);

export const SheetText = ({ children }: { children: string }) => (
  <Text style={styles.sheetText}>{children}</Text>
);

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.space.xs },
  tile: {
    minWidth: 92,
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: appTheme.space.sm,
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.hairline,
  },
  tileValue: { ...appTheme.type.sheetTitle, color: appTheme.colors.text },
  tileLabel: { ...appTheme.type.rowMeta },
  toneOk: { color: appTheme.colors.success },
  toneWarn: { color: appTheme.colors.warning },
  choice: {
    flexDirection: 'row',
    gap: appTheme.space.md,
    alignItems: 'flex-start',
    padding: appTheme.space.md,
    borderRadius: appTheme.radius.lg,
    borderWidth: 1,
    borderColor: appTheme.colors.borderTile,
    backgroundColor: appTheme.colors.surface,
    marginTop: appTheme.space.xs,
  },
  choiceChecked: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: appTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: appTheme.colors.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1.5,
    borderColor: appTheme.colors.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markChecked: {
    backgroundColor: appTheme.colors.accent,
    borderColor: appTheme.colors.accent,
  },
  choiceCopy: { flex: 1, gap: 2 },
  choiceTitle: { ...appTheme.type.rowTitle, color: appTheme.colors.text },
  choiceDetail: { ...appTheme.type.rowMeta },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.md,
    paddingVertical: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    ...appTheme.type.chip,
    color: appTheme.colors.accentOnTint,
    backgroundColor: appTheme.colors.surfaceAccent,
    paddingHorizontal: appTheme.space.sm,
    paddingVertical: 2,
    borderRadius: appTheme.radius.pill,
    overflow: 'hidden',
  },
  phases: { gap: appTheme.space.xs, paddingVertical: appTheme.space.sm },
  phase: { flexDirection: 'row', alignItems: 'center', gap: appTheme.space.sm },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.divider,
  },
  phaseDone: { backgroundColor: appTheme.colors.success },
  phaseNow: { backgroundColor: appTheme.colors.accent },
  phaseLabel: { ...appTheme.type.body, color: appTheme.colors.textMuted },
  phaseLabelNow: { color: appTheme.colors.text },
  sheetText: {
    ...appTheme.type.body,
    color: appTheme.colors.textSecondary,
    marginVertical: appTheme.space.xs,
  },
});
