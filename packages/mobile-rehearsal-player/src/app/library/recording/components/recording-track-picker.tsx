import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import {
  ANY_TRACK_LABEL,
  filterTrackOptions,
  getTrackFilterValueLabel,
  getTrackOptionLabel,
  TRACK_PICKER_EMPTY_MESSAGE,
  TRACK_PICKER_SEARCH_PLACEHOLDER,
} from '../recording-track-filter-model';
import type { RecordingTrackOption } from '../recordings-library-model';

const { colors, radius, space, type } = appTheme;

const LIST_MAX_HEIGHT = 320;

type RecordingTrackPickerProps = {
  options: readonly RecordingTrackOption[];
  /** The chosen track, or `undefined` for any. */
  trackId: string | undefined;
  onChange: (trackId: string | undefined) => void;
};

/**
 * The `Track` filter as a dropdown: one field showing the choice, opening a
 * searchable list, so the sheet does not grow with the library (task 14.20).
 */
export const RecordingTrackPicker = ({
  onChange,
  options,
  trackId,
}: RecordingTrackPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shown = filterTrackOptions(options, query);
  const valueLabel = getTrackFilterValueLabel(options, trackId);

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };
  const choose = (next: string | undefined) => {
    onChange(next);
    close();
  };

  return (
    <>
      <Pressable
        accessibilityLabel={`Track filter, ${valueLabel}`}
        accessibilityRole="button"
        {...interactionGuardProps}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.field,
          buttonInteractionGuardStyle,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text numberOfLines={1} style={styles.fieldValue}>
          {valueLabel}
        </Text>
        <AppIcon color={colors.textMuted} name="chevron-down" size={18} />
      </Pressable>
      <CenteredDialogCard isVisible={isOpen} onRequestClose={close}>
        <TextInput
          accessibilityLabel={TRACK_PICKER_SEARCH_PLACEHOLDER}
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={TRACK_PICKER_SEARCH_PLACEHOLDER}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={query}
        />
        <ScrollView style={styles.list}>
          {query.trim() === '' ? (
            <OptionRow
              isSelected={trackId === undefined}
              label={ANY_TRACK_LABEL}
              onPress={() => choose(undefined)}
            />
          ) : null}
          {shown.map((option) => (
            <OptionRow
              isSelected={trackId === option.trackId}
              key={option.trackId}
              label={getTrackOptionLabel(option)}
              onPress={() => choose(option.trackId)}
            />
          ))}
          {shown.length === 0 ? (
            <Text style={styles.empty}>{TRACK_PICKER_EMPTY_MESSAGE}</Text>
          ) : null}
        </ScrollView>
      </CenteredDialogCard>
    </>
  );
};

const OptionRow = ({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    accessibilityState={{ selected: isSelected }}
    {...interactionGuardProps}
    onPress={onPress}
    style={({ pressed }) => [
      styles.option,
      buttonInteractionGuardStyle,
      pressed ? styles.pressed : null,
    ]}
  >
    <Text numberOfLines={2} style={styles.optionLabel}>
      {label}
    </Text>
    <View style={styles.check}>
      {isSelected ? (
        <AppIcon color={colors.accentText} name="check" size={18} />
      ) : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  check: { width: 24, alignItems: 'center' },
  empty: { ...type.rowMeta, color: colors.textMuted, padding: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: space.touchTarget,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fieldValue: { ...type.rowTitle, color: colors.text, flexShrink: 1 },
  list: { maxHeight: LIST_MAX_HEIGHT },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: space.touchTarget,
    paddingHorizontal: space.xs,
  },
  optionLabel: {
    ...type.rowTitle,
    color: colors.text,
    flex: 1,
    textAlign: 'left',
  },
  pressed: { opacity: 0.7 },
  search: {
    ...type.rowTitle,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    minHeight: space.touchTarget,
  },
});
