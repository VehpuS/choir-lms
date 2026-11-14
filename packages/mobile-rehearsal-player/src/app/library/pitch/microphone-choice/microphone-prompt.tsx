import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import { RememberChoiceRow } from '../../components/remember-choice-row';
import {
  AUTOMATIC_ROW_VALUE,
  inputForRow,
  MICROPHONE_COPY,
  promptRows,
} from './microphone-choice-model';
import { MicrophoneOptionList } from './microphone-option-list';
import {
  usePendingMicrophonePrompt,
  type MicrophonePromptRequest,
} from './microphone-prompt-requests';

const CONTINUE_LABEL = 'Continue';

const MicrophonePrompt = ({
  request,
}: {
  request: MicrophonePromptRequest;
}) => {
  const [selected, setSelected] = useState(AUTOMATIC_ROW_VALUE);
  const [remember, setRemember] = useState(false);
  // Closing the prompt means the system's choice, this once.
  const dismiss = () => {
    request.answer({ input: undefined, remember: false });
  };

  return (
    <CenteredDialogCard isVisible onRequestClose={dismiss}>
      <View style={styles.header}>
        <Text style={styles.title}>{MICROPHONE_COPY.promptTitle}</Text>
        <Text style={styles.body}>{MICROPHONE_COPY.promptBody}</Text>
      </View>
      <MicrophoneOptionList
        accessibilityLabel={MICROPHONE_COPY.promptTitle}
        onSelect={setSelected}
        rows={promptRows(request.inputs)}
        selectedValue={selected}
      />
      <RememberChoiceRow
        checked={remember}
        label={MICROPHONE_COPY.rememberLabel}
        onToggle={() => {
          setRemember((current) => !current);
        }}
      />
      <View style={styles.actions}>
        <OutlinedActionButton
          fill
          label={CONTINUE_LABEL}
          onPress={() => {
            request.answer({
              input: inputForRow(selected, request.inputs),
              remember,
            });
          }}
          variant="accent"
        />
      </View>
    </CenteredDialogCard>
  );
};

/** Shows the microphone prompt whenever the microphone source asks for one. */
export const MicrophonePromptHost = () => {
  const request = usePendingMicrophonePrompt();

  return request ? <MicrophonePrompt request={request} /> : null;
};

const styles = StyleSheet.create({
  actions: { marginTop: appTheme.space.sm },
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  header: { gap: appTheme.space.xs, marginBottom: appTheme.space.sm },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 22,
  },
});
