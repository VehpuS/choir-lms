import { StyleSheet, Text } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { useRecordingOverlayStatus } from './recording-overlay-status';

const { colors, space, type } = appTheme;

/** Says so when a playing recording has no sound of its own and only the track plays. */
export const RecordingOverlayNotice = () => {
  const status = useRecordingOverlayStatus();

  return status.kind === 'missing-audio' ? (
    <Text accessibilityLiveRegion="polite" style={styles.notice}>
      {status.message}
    </Text>
  ) : null;
};

const styles = StyleSheet.create({
  notice: { ...type.rowMeta, color: colors.warning, paddingVertical: space.xs },
});
