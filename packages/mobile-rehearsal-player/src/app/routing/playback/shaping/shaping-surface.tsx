import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { FadedRule } from '../../../components/faded-rule';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import type { NowPlayingSurfaceSummary } from '../../shell/shell-model';
import { nowPlayingStyles } from '../now-playing/styles';
import { PitchControl } from './pitch-control';
import { SpeedControl } from './speed-control';
import {
  SESSION_SCOPE_STATEMENT,
  canResetShaping,
  type PlaybackShapingControls,
  type PlaybackShapingSaveControls,
} from './shaping-surface-model';
import { shapingStyles as styles } from './styles';

const INFO_ICON_SIZE = 18;

/** The commit actions under the session-scope note (screen 1i). */
const SaveActions = ({ save }: { save: PlaybackShapingSaveControls }) => {
  const { availability } = save;

  if (availability.status === 'unavailable') {
    return <Text style={styles.saveHint}>{availability.reason}</Text>;
  }

  const [primary, ...others] = availability.options;

  return (
    <View style={styles.saveActions}>
      {primary ? (
        <OutlinedActionButton
          isBusy={save.isSaving}
          label={primary.label}
          onPress={() => save.onSave(primary.kind)}
          variant="accent"
        />
      ) : null}
      {others.map((option) => (
        <Pressable
          accessibilityRole="button"
          disabled={save.isSaving}
          key={option.kind}
          onPress={() => save.onSave(option.kind)}
          style={styles.secondarySave}
        >
          <Text style={styles.secondarySaveLabel}>
            Also available: {option.label.toLowerCase()}
          </Text>
        </Pressable>
      ))}
      {save.feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          style={
            save.feedback.tone === 'error'
              ? styles.saveFeedbackError
              : styles.saveFeedback
          }
        >
          {save.feedback.message}
        </Text>
      ) : null}
    </View>
  );
};
type ShapingSurfaceProps = {
  controls: PlaybackShapingControls;
  dragHandleProps?: ComponentProps<typeof View>;
  onClose: () => void;
  summary: NowPlayingSurfaceSummary;
};

/** Screen 1i: speed and pitch for the session, and saving it as an adjusted loop or track. */
export const ShapingSurface = ({
  controls,
  onClose,
  summary,
}: ShapingSurfaceProps) => {
  const canReset = canResetShaping(controls.ambient);

  return (
    <View style={nowPlayingStyles.sheet}>
      <View style={nowPlayingStyles.grabber} />
      <View style={nowPlayingStyles.header}>
        <Text style={nowPlayingStyles.headerKicker}>Speed & pitch</Text>
        <View style={nowPlayingStyles.headerActions}>
          <Pressable
            accessibilityLabel="Reset speed and pitch"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canReset }}
            disabled={!canReset}
            onPress={controls.onReset}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && canReset ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.resetLabel,
                canReset ? null : styles.resetLabelDisabled,
              ]}
            >
              Reset
            </Text>
          </Pressable>
          <SurfaceIconButton
            accessibilityLabel="Close speed and pitch"
            icon="chevron-down"
            onPress={onClose}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={nowPlayingStyles.bodyContent}
        style={nowPlayingStyles.body}
      >
        <View style={styles.contextBlock}>
          <Text numberOfLines={1} style={styles.contextTitle}>
            {summary.title}
          </Text>
          {summary.loopRange ? (
            <Text style={styles.contextMeta}>
              Loop · {summary.loopRange.label}
            </Text>
          ) : null}
        </View>

        <SpeedControl
          onSetSpeedMultiplier={controls.onSetSpeedMultiplier}
          speedMultiplier={controls.effective.speedMultiplier}
        />
        <FadedRule />
        <PitchControl
          canShapePitch={controls.canShapePitch}
          onSetPitchSemitones={controls.onSetPitchSemitones}
          pitchSemitones={controls.effective.pitchSemitones}
        />
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerNote}>
          <AppIcon
            color={appTheme.colors.accentText}
            name="information-outline"
            size={INFO_ICON_SIZE}
          />
          <Text style={styles.footerText}>{SESSION_SCOPE_STATEMENT}</Text>
        </View>
        {controls.save ? <SaveActions save={controls.save} /> : null}
      </View>
    </View>
  );
};
