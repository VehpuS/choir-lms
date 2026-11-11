import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { FadedRule } from '../../../components/faded-rule';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import type { NowPlayingSurfaceSummary } from '../../shell/shell-model';
import { nowPlayingStyles } from '../now-playing/styles';
import { AdjustedSaveRename } from './adjusted-save-rename';
import { PitchControl } from './pitch-control';
import { SpeedControl } from './speed-control';
import {
  isShapingFooterShown,
  SESSION_SCOPE_STATEMENT,
  canResetShaping,
  getItemOverrideNote,
  type PlaybackShapingControls,
  type PlaybackShapingSaveControls,
} from './shaping-surface-model';
import { shapingStyles as styles } from './styles';
import { ariaStateProps } from '../../../components/aria-state';
import { darkScrollbarStyle } from '../../../components/dark-scrollbar';

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
      {save.feedback?.tone === 'success' && save.savedName !== null ? (
        <AdjustedSaveRename
          isSaving={save.isSaving}
          key={save.savedName}
          onRename={save.onRename}
          savedName={save.savedName}
        />
      ) : null}
    </View>
  );
};
type ShapingSurfaceProps = {
  controls: PlaybackShapingControls;
  dragHandleProps?: ComponentProps<typeof View>;
  /** Shown as a tab of the wide-short playback view: no grabber or header; Reset moves into the body. */
  embedded?: boolean;
  onClose: () => void;
  summary: NowPlayingSurfaceSummary;
};

/** Screen 1i: speed and pitch for the session, and saving it as an adjusted loop or track. */
export const ShapingSurface = ({
  controls,
  embedded = false,
  onClose,
  summary,
}: ShapingSurfaceProps) => {
  const isLocked = Boolean(controls.lockedReason);
  const canReset = canResetShaping(controls.ambient) && !isLocked;
  // A locked recording says why in its own note, not that the controls set the session.
  const overrideNote = isLocked ? null : getItemOverrideNote(controls);

  // Embedded, the note and the save actions scroll with the controls, so the
  // controls keep the height a fixed footer would take.
  const footer = isShapingFooterShown(controls.lockedReason) ? (
    <View style={[styles.footer, embedded ? styles.footerEmbedded : null]}>
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
  ) : null;

  const resetButton = (
    <Pressable
      accessibilityLabel="Reset speed and pitch"
      accessibilityRole="button"
      accessibilityState={{ disabled: !canReset }}
      {...ariaStateProps({ disabled: !canReset })}
      disabled={!canReset}
      onPress={controls.onReset}
      style={({ pressed }) => [
        styles.resetButton,
        pressed && canReset ? styles.pressed : null,
      ]}
    >
      <Text
        style={[styles.resetLabel, canReset ? null : styles.resetLabelDisabled]}
      >
        Reset
      </Text>
    </Pressable>
  );

  return (
    <View style={embedded ? nowPlayingStyles.column : nowPlayingStyles.sheet}>
      {embedded ? null : (
        <>
          <View style={nowPlayingStyles.grabber} />
          <View style={nowPlayingStyles.header}>
            <Text style={nowPlayingStyles.headerKicker}>Speed & pitch</Text>
            <View style={nowPlayingStyles.headerActions}>
              {resetButton}
              <SurfaceIconButton
                accessibilityLabel="Close speed and pitch"
                icon="chevron-down"
                onPress={onClose}
              />
            </View>
          </View>
        </>
      )}

      <ScrollView
        contentContainerStyle={
          embedded
            ? nowPlayingStyles.bodyContentColumn
            : nowPlayingStyles.bodyContent
        }
        style={[darkScrollbarStyle, nowPlayingStyles.body]}
      >
        {embedded ? (
          <View style={styles.embeddedReset}>{resetButton}</View>
        ) : null}
        <View style={styles.contextBlock}>
          {/* The tab says what this is and the left column names the track. */}
          {embedded ? null : (
            <Text numberOfLines={1} style={styles.contextTitle}>
              {summary.title}
            </Text>
          )}
          {summary.loopRange ? (
            <Text style={styles.contextMeta}>
              Loop · {summary.loopRange.label}
            </Text>
          ) : null}
        </View>

        {controls.lockedReason ? (
          <Text accessibilityLiveRegion="polite" style={styles.overrideNote}>
            {controls.lockedReason}
          </Text>
        ) : null}
        {overrideNote ? (
          <Text accessibilityLiveRegion="polite" style={styles.overrideNote}>
            {overrideNote}
          </Text>
        ) : null}
        {/* The sliders edit the session (ambient); an adjusted item's own
            transform is what plays, and the note above says so. */}
        <SpeedControl
          disabled={isLocked}
          onSetSpeedMultiplier={controls.onSetSpeedMultiplier}
          speedMultiplier={controls.ambient.speedMultiplier}
        />
        <FadedRule />
        <PitchControl
          canShapePitch={controls.canShapePitch}
          disabled={isLocked}
          onSetPitchSemitones={controls.onSetPitchSemitones}
          pitchSemitones={controls.ambient.pitchSemitones}
        />
        {embedded ? footer : null}
      </ScrollView>
      {embedded ? null : footer}
    </View>
  );
};
