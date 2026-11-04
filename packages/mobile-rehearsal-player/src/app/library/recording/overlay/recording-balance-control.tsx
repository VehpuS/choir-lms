import { View } from 'react-native';

import { getRecordingsStore } from '../recordings-store-instance';
import { RecordingBalanceSlider } from './recording-balance-slider';
import { RecordingLevelControl } from './recording-level-control';
import { RecordingMixLink } from './recording-mix-link';
import { canSaveMixAsDefault, SAVE_MIX_LABEL } from './recording-level-model';
import {
  markRecordingMixSaved,
  setRecordingMixBalance,
  setRecordingMixLevel,
  useRecordingMixState,
} from './recording-mix-store';

/**
 * Balance and level of the recording that is playing. Moving either changes
 * the sound for this listening session only; `Save as default` keeps both as
 * the recording's saved values, which exports and playlists start from
 * (rehearsal-recording design Decisions 5, 9 and 21).
 */
export const RecordingBalanceControl = () => {
  const { balance, levelDb, recordingId, savedBalance, savedLevelDb } =
    useRecordingMixState();

  if (recordingId === null) {
    return null;
  }

  const saveAsDefault = () => {
    void getRecordingsStore()
      .update(recordingId, { balance, levelDb })
      .then(markRecordingMixSaved)
      .catch(() => undefined);
  };

  return (
    <View>
      <RecordingBalanceSlider
        onChange={setRecordingMixBalance}
        value={balance}
      />
      <RecordingLevelControl
        extraActions={
          canSaveMixAsDefault(
            { balance, levelDb },
            { balance: savedBalance, levelDb: savedLevelDb },
          ) ? (
            <RecordingMixLink label={SAVE_MIX_LABEL} onPress={saveAsDefault} />
          ) : null
        }
        levelDb={levelDb}
        onChange={setRecordingMixLevel}
        recordingId={recordingId}
      />
    </View>
  );
};
