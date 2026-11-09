import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { appTheme } from '../../../utils/theme';
import {
  buildCompositeLoadingModel,
  type CompositeLoadingModel,
} from './composite-load-model';
import type { CompositeLoadState } from './composite-load-state';

const { colors, radius, space, type } = appTheme;
const BAR_HEIGHT = 6;
const CHECK_SIZE = 15;
const PERCENT = 100;

export const CompositeLoadingPanelView = ({
  model,
}: {
  model: CompositeLoadingModel;
}) => (
  <View style={styles.panel}>
    <Text style={styles.subtitle}>{model.subtitle}</Text>
    <View
      accessibilityLabel={model.subtitle}
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: PERCENT,
        min: 0,
        now: Math.round(model.progressFraction * PERCENT),
      }}
      style={styles.track}
    >
      <View
        style={[
          styles.fill,
          { width: `${Math.round(model.progressFraction * PERCENT)}%` },
        ]}
      />
    </View>
    {model.currentLabel ? (
      <View style={styles.row}>
        <Text style={styles.rowText}>{model.currentLabel}</Text>
        <Text style={styles.status}>{model.counter}</Text>
      </View>
    ) : (
      model.rows.map((row) => (
        <View key={row.stemId} style={styles.row}>
          <View style={styles.check}>
            {row.isReady ? (
              <AppIcon color={colors.success} name="check" size={CHECK_SIZE} />
            ) : null}
          </View>
          <Text style={styles.rowText}>{row.name}</Text>
          <Text style={styles.status}>{row.statusLabel}</Text>
        </View>
      ))
    )}
    <Text style={styles.hint}>{model.hint}</Text>
  </View>
);

/** The loading state of the composite that is loading: progress per stem, and why it takes a moment. */
export const CompositeLoadingPanel = ({
  names,
  state,
}: {
  names: ReadonlyMap<string, string>;
  state: CompositeLoadState;
}) => (
  <CompositeLoadingPanelView
    model={buildCompositeLoadingModel({
      names,
      phase: state.phase,
      stems: state.stems,
    })}
  />
);

const styles = StyleSheet.create({
  check: { width: CHECK_SIZE },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: BAR_HEIGHT,
  },
  hint: { ...type.rowMeta, color: colors.textFaint },
  panel: { gap: space.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: space.md },
  rowText: { ...type.rowTitle, color: colors.text, flex: 1 },
  status: { ...type.rowMeta, color: colors.textMuted },
  subtitle: { ...type.rowMeta, color: colors.textMuted },
  track: {
    backgroundColor: colors.divider,
    borderRadius: radius.sm,
    height: BAR_HEIGHT,
    overflow: 'hidden',
  },
});
