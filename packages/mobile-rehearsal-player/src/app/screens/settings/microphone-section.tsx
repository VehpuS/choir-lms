import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AUDIO_ROUTE_COPY,
  AUDIO_ROUTE_ROWS,
} from '../../components/audio-session/audio-route-copy';
import {
  audioRouteStore,
  parseAudioRoute,
  useAudioRoute,
} from '../../components/audio-session/audio-route-store';
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
  const audioRoute = useAudioRoute();

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
      <Text style={styles.title}>{AUDIO_ROUTE_COPY.title}</Text>
      <Text style={styles.body}>{AUDIO_ROUTE_COPY.body}</Text>
      <MicrophoneOptionList
        accessibilityLabel={AUDIO_ROUTE_COPY.title}
        onSelect={(value) => {
          void audioRouteStore.set(parseAudioRoute(value));
        }}
        rows={AUDIO_ROUTE_ROWS}
        selectedValue={audioRoute}
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
  title: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
    marginTop: appTheme.space.md,
  },
});
