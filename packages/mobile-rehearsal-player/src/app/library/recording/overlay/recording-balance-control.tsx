import { StyleSheet, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { getRecordingsStore } from '../recordings-store-instance';
import { RecordingBalanceSlider } from './recording-balance-slider';
import {
  canSaveBalanceAsDefault,
  SAVE_BALANCE_LABEL,
} from './recording-mix-model';
import {
  markRecordingMixSaved,
  setRecordingMixBalance,
  useRecordingMixState,
} from './recording-mix-store';

/**
 * Balance between the track and the recording that is playing. Moving it
 * changes the sound for this listening session only; `Save as default` keeps
 * the position as the recording's saved balance, which exports and playlists
 * start from (rehearsal-recording design Decisions 5 and 9).
 */
export const RecordingBalanceControl = () => {
  const { balance, recordingId, savedBalance } = useRecordingMixState();

  if (recordingId === null) {
    return null;
  }

  const saveAsDefault = () => {
    void getRecordingsStore()
      .update(recordingId, { balance })
      .then(markRecordingMixSaved)
      .catch(() => undefined);
  };

  return (
    <View>
      <RecordingBalanceSlider
        onChange={setRecordingMixBalance}
        value={balance}
      />
      {canSaveBalanceAsDefault(balance, savedBalance) ? (
        <View style={styles.actions}>
          <OutlinedActionButton
            label={SAVE_BALANCE_LABEL}
            onPress={saveAsDefault}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: { alignItems: 'flex-end', paddingBottom: appTheme.space.xs },
});
