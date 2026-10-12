import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { SegmentedControl } from '../../../components/segmented-control';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import type { BulkChoiceQuestion } from '../bulk-choices';
import {
  DEFAULT_PROMPT_ANSWERS,
  getBulkChoicesPromptCopy,
  type BulkChoiceAnswers,
} from './model';
import { ariaStateProps } from '../../../components/aria-state';

const CHECKBOX_SIZE = 22;

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

      <Pressable
        accessibilityLabel={copy.rememberLabel}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: remember }}
        {...ariaStateProps({ checked: remember })}
        {...interactionGuardProps}
        onPress={() => {
          setRemember((current) => !current);
        }}
        style={[styles.rememberRow, buttonInteractionGuardStyle]}
      >
        <View style={[styles.checkbox, remember ? styles.checkboxOn : null]}>
          {remember ? (
            <AppIcon
              color={appTheme.colors.accentOnTint}
              name="check"
              size={16}
            />
          ) : null}
        </View>
        <Text style={styles.rememberLabel}>{copy.rememberLabel}</Text>
      </Pressable>

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
  checkbox: {
    alignItems: 'center',
    borderColor: appTheme.colors.borderButton,
    borderRadius: appTheme.radius.sm,
    borderWidth: 1,
    height: CHECKBOX_SIZE,
    justifyContent: 'center',
    width: CHECKBOX_SIZE,
  },
  checkboxOn: {
    backgroundColor: appTheme.colors.surfaceAccent,
    borderColor: appTheme.colors.accent,
  },
  question: {
    gap: appTheme.space.xs,
    marginBottom: appTheme.space.sm,
  },
  rememberLabel: {
    color: appTheme.colors.text,
    fontSize: 15,
  },
  // 44pt row, the touch-target minimum, with the box inside it.
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 22,
  },
});
