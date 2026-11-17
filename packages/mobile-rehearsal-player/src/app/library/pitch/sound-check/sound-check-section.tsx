import { useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ariaStateProps } from '../../../components/aria-state';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { MicrophoneOptionList } from '../microphone-choice/microphone-option-list';
import {
  describeReadout,
  SESSION_TYPE_CHOICES,
  SOUND_CHECK_COPY,
} from './sound-check-model';
import { getSoundCheck } from './sound-check-browser';
import type { ToneKind } from './sound-check-player';

const READOUT_INTERVAL_MS = 1000;

const TONES: ReadonlyArray<{ kind: ToneKind; label: string }> = [
  { kind: 'web-audio-new', label: SOUND_CHECK_COPY.webAudioNew },
  { kind: 'web-audio-app', label: SOUND_CHECK_COPY.webAudioApp },
  { kind: 'media-element', label: SOUND_CHECK_COPY.mediaElement },
];

const Switch = (props: {
  label: string;
  checked: boolean;
  note?: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={props.label}
    accessibilityRole="switch"
    accessibilityState={{ checked: props.checked }}
    {...ariaStateProps({ checked: props.checked })}
    {...interactionGuardProps}
    onPress={props.onPress}
    style={[styles.switchRow, buttonInteractionGuardStyle]}
  >
    <Text style={styles.switchLabel}>{props.label}</Text>
    <Text style={styles.switchState}>
      {props.note ?? (props.checked ? 'On' : 'Off')}
    </Text>
  </Pressable>
);

/**
 * Experimental (clear-playback-while-listening): play a test sound, open the
 * microphone and set the audio session type independently, and read what the
 * page sees, to find on a phone what makes Bluetooth earbuds sound thin.
 * Everything it starts stops when the page closes.
 */
export const SoundCheckSection = () => {
  const check = getSoundCheck();
  const state = useSyncExternalStore(
    check.subscribe,
    check.getState,
    check.getState,
  );
  const [readout, setReadout] = useState(() => check.readReadout());

  useEffect(() => {
    const refresh = () => setReadout(check.readReadout());
    const timer = setInterval(refresh, READOUT_INTERVAL_MS);

    refresh();

    return () => {
      clearInterval(timer);
      check.stopAll();
    };
  }, [check]);

  const microphoneNote =
    state.microphone === 'opening'
      ? 'Opening…'
      : state.microphone === 'failed'
        ? 'Could not open'
        : undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{SOUND_CHECK_COPY.title}</Text>
      <Text style={styles.body}>{SOUND_CHECK_COPY.body}</Text>
      {TONES.map((tone) => (
        <Switch
          checked={state.tones[tone.kind]}
          key={tone.kind}
          label={tone.label}
          onPress={() => {
            void check.toggleTone(tone.kind);
          }}
        />
      ))}
      <Switch
        checked={state.microphone === 'open'}
        label={SOUND_CHECK_COPY.microphone}
        note={microphoneNote}
        onPress={() => {
          void check.toggleMicrophone();
        }}
      />
      <MicrophoneOptionList
        accessibilityLabel={SOUND_CHECK_COPY.sessionTitle}
        onSelect={(value) => {
          check.setSessionType(value);
          setReadout(check.readReadout());
        }}
        rows={SESSION_TYPE_CHOICES}
        selectedValue={readout.sessionType ?? ''}
      />
      <View accessibilityLabel="Sound check readout" style={styles.readout}>
        {describeReadout(readout).map((line) => (
          <Text key={line} style={styles.readoutLine}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  readout: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: 8,
    gap: 2,
    padding: appTheme.space.sm,
  },
  readoutLine: {
    color: appTheme.colors.text,
    fontSize: 13,
  },
  section: { gap: appTheme.space.sm, marginTop: appTheme.space.lg },
  switchLabel: {
    color: appTheme.colors.text,
    flex: 1,
    fontSize: 15,
  },
  switchRow: {
    alignItems: 'center',
    borderBottomColor: appTheme.colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: appTheme.space.md,
    minHeight: 48,
  },
  switchState: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
});
