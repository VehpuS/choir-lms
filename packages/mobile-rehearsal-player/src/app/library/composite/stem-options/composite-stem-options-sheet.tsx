import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import { MAX_STEM_NAME_LENGTH } from '../create/create-sheet-model';
import { STEM_OPTIONS_COPY, type StemOptionsModel } from './stem-options-model';

const { colors, space, radius, type } = appTheme;

export const STEM_NAME_FIELD_LABEL = 'Stem name';

type CompositeStemOptionsSheetProps = {
  model: StemOptionsModel;
  onClose: () => void;
  onRename: (name: string) => void;
  onToggleMine: (mine: boolean) => void;
  onStepOffset: (deltaMs: number) => void;
  onRemove: () => void;
  /** Removing would leave one stem: the sheet asks first, then deletes. */
  onDeleteComposite: () => void;
  /** The link is left out without it. */
  onShowOriginalTrack?: () => void;
};

/**
 * Edits one stem of a composite: its name (saved when the field is left or the
 * sheet closes), whether it is the user's part, its offset and removal.
 */
export const CompositeStemOptionsSheet = ({
  model,
  onClose,
  onDeleteComposite,
  onRemove,
  onRename,
  onShowOriginalTrack,
  onStepOffset,
  onToggleMine,
}: CompositeStemOptionsSheetProps) => {
  const [name, setName] = useState(model.name);
  const [isAskingToDelete, setIsAskingToDelete] = useState(false);
  const commitName = () => {
    if (name !== model.name) {
      onRename(name);
    }
  };
  const close = () => {
    commitName();
    onClose();
  };

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow
            label={STEM_OPTIONS_COPY.doneLabel}
            onPress={close}
            tone="preferred"
          />
        </MenuGroup>
      }
      isVisible={true}
      onClose={close}
      scrollable={true}
      title={model.title}
    >
      <View style={styles.body}>
        {model.subtitle ? (
          <Text style={styles.label}>{model.subtitle}</Text>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>{STEM_OPTIONS_COPY.nameLabel}</Text>
          <TextInput
            accessibilityLabel={STEM_NAME_FIELD_LABEL}
            autoCorrect={false}
            maxLength={MAX_STEM_NAME_LENGTH}
            onBlur={commitName}
            onChangeText={setName}
            selectTextOnFocus
            style={styles.input}
            value={name}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.rowTitle}>{STEM_OPTIONS_COPY.mineLabel}</Text>
            <Text style={styles.label}>{STEM_OPTIONS_COPY.mineHint}</Text>
          </View>
          <Switch
            accessibilityLabel={STEM_OPTIONS_COPY.mineLabel}
            onValueChange={onToggleMine}
            trackColor={{ false: colors.borderChip, true: colors.accent }}
            value={model.mine}
          />
        </View>
        <Text style={styles.label}>{STEM_OPTIONS_COPY.offsetLabel}</Text>
        <View style={styles.stepper}>
          {model.steps.slice(0, 2).map((step) => (
            <StepButton key={step.deltaMs} onPress={onStepOffset} step={step} />
          ))}
          <Text
            accessibilityLabel={`Offset ${model.offsetLabel}`}
            style={styles.offset}
          >
            {model.offsetLabel}
          </Text>
          {model.steps.slice(2).map((step) => (
            <StepButton key={step.deltaMs} onPress={onStepOffset} step={step} />
          ))}
        </View>
        <Text style={styles.label}>{STEM_OPTIONS_COPY.offsetHint}</Text>
        {isAskingToDelete ? (
          <View style={styles.ask}>
            <Text style={styles.rowTitle}>
              {STEM_OPTIONS_COPY.deleteQuestion}
            </Text>
            <MenuGroup>
              <MenuRow
                label={STEM_OPTIONS_COPY.deleteLabel}
                onPress={onDeleteComposite}
                tone="destructive"
              />
              <MenuRow
                label={STEM_OPTIONS_COPY.keepLabel}
                onPress={() => setIsAskingToDelete(false)}
              />
            </MenuGroup>
          </View>
        ) : (
          <MenuGroup>
            <MenuRow
              label={STEM_OPTIONS_COPY.removeLabel}
              onPress={() =>
                model.removeAsksToDelete
                  ? setIsAskingToDelete(true)
                  : onRemove()
              }
              tone="destructive"
            />
            {onShowOriginalTrack ? (
              <MenuRow
                label={STEM_OPTIONS_COPY.showOriginalLabel}
                onPress={onShowOriginalTrack}
              />
            ) : null}
          </MenuGroup>
        )}
      </View>
    </BottomSheetSurface>
  );
};

const StepButton = ({
  onPress,
  step,
}: {
  onPress: (deltaMs: number) => void;
  step: StemOptionsModel['steps'][number];
}) => (
  <Pressable
    accessibilityLabel={`Offset ${step.label} ms`}
    accessibilityRole="button"
    accessibilityState={{ disabled: step.disabled }}
    disabled={step.disabled}
    onPress={() => onPress(step.deltaMs)}
    style={[styles.step, step.disabled ? styles.stepDisabled : undefined]}
  >
    <Text style={styles.stepText}>{step.label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  ask: { gap: space.sm },
  body: { gap: space.sm },
  field: { gap: space.xxs },
  input: {
    minHeight: space.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: type.input.fontSize,
    backgroundColor: colors.surface,
  },
  label: { ...type.rowMeta, color: colors.textMuted },
  offset: {
    ...type.rowTitle,
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
  },
  rowTitle: { ...type.rowTitle, color: colors.text },
  step: {
    minHeight: space.touchTarget,
    minWidth: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderChip,
    backgroundColor: colors.surface,
  },
  stepDisabled: { opacity: 0.4 },
  stepText: { ...type.rowMeta, color: colors.text },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  switchText: { flex: 1, minWidth: 0 },
});
