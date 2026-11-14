import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  choiceFromRow,
  hasInputNames,
  MICROPHONE_COPY,
  selectedRowValue,
  settingsRows,
  toMicrophoneInputs,
  type MicrophoneInput,
} from '../../library/pitch/microphone-choice/microphone-choice-model';
import {
  microphoneChoiceStore,
  useMicrophoneChoice,
} from '../../library/pitch/microphone-choice/microphone-choice-store';
import {
  listMediaDevices,
  onMicrophoneDevicesChanged,
} from '../../library/pitch/microphone-choice/microphone-inputs';
import { MicrophoneOptionList } from '../../library/pitch/microphone-choice/microphone-option-list';
import { appTheme } from '../../utils/theme';

// The inputs connected now, kept current as they are plugged in and removed.
const useConnectedInputs = () => {
  const [inputs, setInputs] = useState<MicrophoneInput[]>([]);
  const [namesShown, setNamesShown] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    const refresh = () => {
      void listMediaDevices().then((devices) => {
        if (isCurrent) {
          setInputs(toMicrophoneInputs(devices));
          setNamesShown(hasInputNames(devices));
        }
      });
    };

    refresh();
    const stop = onMicrophoneDevicesChanged(refresh);

    return () => {
      isCurrent = false;
      stop();
    };
  }, []);

  return { inputs, namesShown };
};

// Where the microphone remembered in the prompt is shown, changed or cleared,
// so a choice that skips the prompt is never invisible.
export const MicrophoneSection = () => {
  const choice = useMicrophoneChoice();
  const { inputs, namesShown } = useConnectedInputs();

  return (
    <View style={styles.section}>
      <Text style={styles.body}>{MICROPHONE_COPY.body}</Text>
      {namesShown ? null : (
        <Text style={styles.body}>{MICROPHONE_COPY.namesHiddenHint}</Text>
      )}
      <MicrophoneOptionList
        accessibilityLabel={MICROPHONE_COPY.settingsTitle}
        onSelect={(value) => {
          const known =
            choice?.kind === 'input' ? [...inputs, choice.input] : inputs;

          void microphoneChoiceStore.set(choiceFromRow(value, known));
        }}
        rows={settingsRows(choice, inputs)}
        selectedValue={selectedRowValue(choice)}
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
