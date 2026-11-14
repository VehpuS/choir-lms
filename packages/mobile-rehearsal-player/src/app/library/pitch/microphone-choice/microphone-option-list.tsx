import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ariaStateProps } from '../../../components/aria-state';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import type { ChoiceRow } from './microphone-choice-model';

const RADIO_SIZE = 20;
const RADIO_DOT_SIZE = 10;

type MicrophoneOptionListProps = {
  accessibilityLabel: string;
  onSelect: (value: string) => void;
  rows: readonly ChoiceRow[];
  selectedValue: string;
};

// One radio list for both the prompt and Settings, so the two look alike.
export const MicrophoneOptionList = ({
  accessibilityLabel,
  onSelect,
  rows,
  selectedValue,
}: MicrophoneOptionListProps) => (
  <View accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup">
    {rows.map((row) => {
      const checked = row.value === selectedValue;

      return (
        <Pressable
          accessibilityLabel={row.label}
          accessibilityRole="radio"
          accessibilityState={{ checked }}
          {...ariaStateProps({ checked })}
          {...interactionGuardProps}
          key={row.value}
          onPress={() => {
            onSelect(row.value);
          }}
          style={[styles.row, buttonInteractionGuardStyle]}
        >
          <View style={[styles.radio, checked ? styles.radioOn : null]}>
            {checked ? <View style={styles.dot} /> : null}
          </View>
          <Text style={styles.label}>{row.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  dot: {
    backgroundColor: appTheme.colors.accent,
    borderRadius: RADIO_DOT_SIZE / 2,
    height: RADIO_DOT_SIZE,
    width: RADIO_DOT_SIZE,
  },
  label: {
    color: appTheme.colors.text,
    flex: 1,
    fontSize: 15,
  },
  radio: {
    alignItems: 'center',
    borderColor: appTheme.colors.borderButton,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 1,
    height: RADIO_SIZE,
    justifyContent: 'center',
    width: RADIO_SIZE,
  },
  radioOn: { borderColor: appTheme.colors.accent },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
  },
});
