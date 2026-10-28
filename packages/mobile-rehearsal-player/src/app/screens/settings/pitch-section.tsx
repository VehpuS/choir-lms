import { StyleSheet, Text, View } from 'react-native';

import { pitchCapabilities } from '../../library/pitch/pitch-capabilities';
import { PitchLevelMeter } from '../../library/pitch/components/pitch-view/pitch-level-meter';
import { setPitchLevelCutoffDb, usePitch } from '../../library/pitch/use-pitch';
import { appTheme } from '../../utils/theme';
import { PITCH_SETTINGS_COPY } from './model';

/**
 * The same minimum volume control as the Pitch view's settings sheet. Reading
 * the pitch state registers a consumer, so capture that the user started
 * keeps running here and the meter can show the level.
 */
export const PitchSection = () => {
  const { state } = usePitch();

  if (!pitchCapabilities().canListen) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.body}>{PITCH_SETTINGS_COPY.body}</Text>
      <PitchLevelMeter
        cutoffDb={state.levelCutoffDb}
        isListening={state.status === 'listening'}
        onChangeCutoffDb={setPitchLevelCutoffDb}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  section: { gap: appTheme.space.sm },
});
