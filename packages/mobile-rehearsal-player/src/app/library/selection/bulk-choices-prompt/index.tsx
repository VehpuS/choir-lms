import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { SegmentedControl } from '../../../components/segmented-control';
import { appTheme } from '../../../utils/theme';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import { RememberChoiceRow } from '../../components/remember-choice-row';
import type { BulkChoiceQuestion } from '../bulk-choices';
import {
  DEFAULT_PROMPT_ANSWERS,
  getBulkChoicesPromptCopy,
  type BulkChoiceAnswers,
} from './model';

type BulkChoicesPromptProps = {
  dueQuestions: readonly BulkChoiceQuestion[];
  onCancel: () => void;
  onConfirm: (result: {
    answers: BulkChoiceAnswers;
    remember: boolean;
  }) => void;
  playlistLinkCount: number;
  repeatCount: number;
};

// One sheet per action that asks only the due questions together (design
// "Bulk action preferences"). Cancel applies nothing.
export const BulkChoicesPrompt = ({
  dueQuestions,
  onCancel,
  onConfirm,
  playlistLinkCount,
  repeatCount,
}: BulkChoicesPromptProps) => {
  const [answers, setAnswers] = useState(DEFAULT_PROMPT_ANSWERS);
  const [remember, setRemember] = useState(false);
  const copy = getBulkChoicesPromptCopy({
    dueQuestions,
    playlistLinkCount,
    repeatCount,
  });

  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      {copy.questions.map((question) => {
        const answerKey = question.question;

        return (
          <View key={answerKey} style={styles.question}>
            <Text style={styles.title}>{question.title}</Text>
            <Text style={styles.body}>{question.body}</Text>
            <SegmentedControl
              accessibilityLabel={question.title}
              onSelect={(value) => {
                setAnswers((current) => ({ ...current, [answerKey]: value }));
              }}
              options={question.options}
              selectedValue={answers[answerKey]}
            />
          </View>
        );
      })}

      <RememberChoiceRow
        checked={remember}
        label={copy.rememberLabel}
        onToggle={() => {
          setRemember((current) => !current);
        }}
      />

      <View style={styles.actions}>
        <OutlinedActionButton
          fill
          label={copy.cancelLabel}
          onPress={onCancel}
          variant="neutral"
        />
        <OutlinedActionButton
          fill
          label={copy.confirmLabel}
          onPress={() => {
            onConfirm({ answers, remember });
          }}
          variant="accent"
        />
      </View>
    </CenteredDialogCard>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.sm,
    marginTop: appTheme.space.sm,
  },
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  question: {
    gap: appTheme.space.xs,
    marginBottom: appTheme.space.sm,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 22,
  },
});
