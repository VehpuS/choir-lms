import { Slider } from '@miblanchard/react-native-slider';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AccessibleSlider } from '../../../components/accessible-slider';
import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import {
  MAX_VOLUME_PERCENT,
  REMOVE_LABEL,
  STEM_MISSING_HINT,
  STEM_MISSING_LABEL,
  YOUR_PART_LABEL,
  type MixPanelRow,
} from './mix-panel-model';

const { colors, space, type } = appTheme;
const NAME_WIDTH = 76;
const SMALL_BUTTON = 32;
const READOUT_WIDTH = 42;
const SILENT_OPACITY = 0.45;
const VOLUME_STEP = 5;

type MixStemRowProps = {
  row: MixPanelRow;
  onToggleMute: (stemId: string) => void;
  onToggleSolo: (stemId: string) => void;
  onSetVolume: (stemId: string, volume: number) => void;
  onOpenOptions: (stemId: string) => void;
  onRemove: (stemId: string) => void;
};

const getSliderNumber = (value: number | number[]) =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

type ToggleProps = {
  label: string;
  letter: string;
  isOn: boolean;
  onPress: () => void;
  onColor: string;
  onFill: string;
};

const MuteSoloButton = ({
  isOn,
  label,
  letter,
  onColor,
  onFill,
  onPress,
}: ToggleProps) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    accessibilityState={{ selected: isOn }}
    aria-pressed={isOn}
    hitSlop={space.xs}
    onPress={onPress}
    style={[
      styles.toggle,
      buttonInteractionGuardStyle,
      isOn ? { backgroundColor: onFill, borderColor: onColor } : null,
    ]}
  >
    <Text style={[styles.toggleLetter, isOn ? { color: onColor } : null]}>
      {letter}
    </Text>
  </Pressable>
);

/** One stem: mute, solo, a 0 to 150% volume, its options; or the missing state. */
export const MixStemRow = ({
  onOpenOptions,
  onRemove,
  onSetVolume,
  onToggleMute,
  onToggleSolo,
  row,
}: MixStemRowProps) => {
  const nameBlock = (
    <View style={styles.name}>
      <Text
        numberOfLines={1}
        style={[styles.nameText, row.isMissing ? styles.missingName : null]}
      >
        {row.name}
      </Text>
      {row.isMissing ? (
        <Text style={styles.subline}>{STEM_MISSING_LABEL}</Text>
      ) : row.isMine ? (
        <Text style={[styles.subline, styles.mine]}>{YOUR_PART_LABEL}</Text>
      ) : null}
    </View>
  );

  if (row.isMissing) {
    return (
      <View style={styles.row}>
        {nameBlock}
        <Text numberOfLines={2} style={[styles.subline, styles.hint]}>
          {STEM_MISSING_HINT}
        </Text>
        <Pressable
          accessibilityLabel={`${REMOVE_LABEL} ${row.name}`}
          accessibilityRole="button"
          hitSlop={space.xs}
          onPress={() => onRemove(row.stemId)}
          style={buttonInteractionGuardStyle}
        >
          <Text style={styles.link}>{REMOVE_LABEL}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.name, row.isSilent ? styles.silent : null]}>
        {nameBlock}
      </View>
      <MuteSoloButton
        isOn={row.isMuted}
        label={`Mute ${row.name}`}
        letter="M"
        onColor={colors.danger}
        onFill={colors.dangerFill}
        onPress={() => onToggleMute(row.stemId)}
      />
      <MuteSoloButton
        isOn={row.isSoloed}
        label={`Solo ${row.name}`}
        letter="S"
        onColor={colors.warning}
        onFill={colors.warningFill}
        onPress={() => onToggleSolo(row.stemId)}
      />
      <View
        {...interactionGuardProps}
        style={[continuousInteractionGuardStyle, styles.slider]}
      >
        <AccessibleSlider
          label={`${row.name} volume`}
          maximum={MAX_VOLUME_PERCENT}
          minimum={0}
          onChange={(next) => onSetVolume(row.stemId, next)}
          step={VOLUME_STEP}
          value={row.volume}
          valueText={row.volumeLabel}
        >
          <Slider
            maximumTrackTintColor={colors.divider}
            maximumValue={MAX_VOLUME_PERCENT}
            minimumTrackTintColor={colors.accent}
            minimumValue={0}
            onValueChange={(next) =>
              onSetVolume(row.stemId, getSliderNumber(next))
            }
            step={1}
            thumbTintColor={colors.text}
            value={row.volume}
          />
        </AccessibleSlider>
      </View>
      <Text style={[styles.readout, row.isSilent ? styles.silent : null]}>
        {row.volumeLabel}
      </Text>
      <Pressable
        accessibilityLabel={`${row.name} options`}
        accessibilityRole="button"
        hitSlop={space.xs}
        onPress={() => onOpenOptions(row.stemId)}
        style={[styles.more, buttonInteractionGuardStyle]}
      >
        <AppIcon color={colors.textMuted} name="dots-vertical" size={18} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, flex: 1 },
  link: {
    ...type.rowMeta,
    color: colors.accentText,
    textDecorationLine: 'underline',
  },
  mine: { color: colors.accentText },
  missingName: { color: colors.danger },
  more: {
    alignItems: 'center',
    height: SMALL_BUTTON,
    justifyContent: 'center',
    width: SMALL_BUTTON,
  },
  name: { width: NAME_WIDTH },
  nameText: { ...type.rowMeta, color: colors.text },
  readout: {
    ...type.rowMeta,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: READOUT_WIDTH,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: space.touchTarget,
  },
  silent: { opacity: SILENT_OPACITY },
  slider: { flex: 1 },
  subline: { ...type.rowMeta, color: colors.textFaint, fontSize: 10.5 },
  toggle: {
    alignItems: 'center',
    borderColor: colors.borderChip,
    borderRadius: 8,
    borderWidth: 1,
    height: SMALL_BUTTON,
    justifyContent: 'center',
    width: SMALL_BUTTON,
  },
  toggleLetter: { ...type.rowMeta, color: colors.textMuted, fontWeight: '700' },
});
