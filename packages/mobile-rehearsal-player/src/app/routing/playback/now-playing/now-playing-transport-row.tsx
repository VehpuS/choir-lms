import { Pressable, View } from 'react-native';

import { AppIcon, type AppIconName } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import {
  getNowPlayingTransportAppearance,
  getNowPlayingTransportControls,
  type NowPlayingTransportControl,
} from './now-playing-model';
import { nowPlayingStyles as styles } from './styles';
import { getPlaybackToggleControlModel } from '../playback-toggle-control-model';

export type NowPlayingTransportRowProps = {
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  isPlaybackToggleDisabled: boolean;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackToggleLabel: string;
  supportsQueueNavigation: boolean;
  title: string;
};

type TransportButtonModel = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: AppIconName;
  onPress: () => void;
  selected?: boolean;
};

const TransportButton = ({
  button,
  control,
}: {
  button: TransportButtonModel;
  control: NowPlayingTransportControl;
}) => {
  const appearance = getNowPlayingTransportAppearance(control);

  return (
    <Pressable
      accessibilityLabel={button.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled: button.disabled,
        selected: button.selected,
      }}
      {...interactionGuardProps}
      disabled={button.disabled}
      onPress={button.onPress}
      style={({ pressed }) => [
        styles.transportButton,
        { height: appearance.size, width: appearance.size },
        appearance.ring ? styles.transportRing : null,
        buttonInteractionGuardStyle,
        pressed && !button.disabled ? styles.pressed : null,
        button.disabled ? styles.disabled : null,
      ]}
    >
      <AppIcon
        color={appearance.iconColor}
        name={button.icon}
        size={appearance.iconSize}
      />
    </Pressable>
  );
};

const getSecondaryButton = (
  control: Exclude<NowPlayingTransportControl, 'toggle-playback'>,
  props: NowPlayingTransportRowProps,
): TransportButtonModel => {
  switch (control) {
    case 'previous-item':
      return {
        accessibilityLabel: 'Previous queue item',
        disabled: !props.canSkipPreviousItem,
        icon: 'skip-previous',
        onPress: props.onSkipPreviousItem,
      };
    case 'seek-backward':
      return {
        accessibilityLabel: 'Back 15 seconds',
        disabled: !props.canSeekActivePlayback,
        icon: 'rewind-15',
        onPress: props.onSeekBackward,
      };
    case 'seek-forward':
      return {
        accessibilityLabel: 'Forward 15 seconds',
        disabled: !props.canSeekActivePlayback,
        icon: 'fast-forward-15',
        onPress: props.onSeekForward,
      };
    case 'next-item':
      return {
        accessibilityLabel: 'Next queue item',
        disabled: !props.canSkipNextItem,
        icon: 'skip-next',
        onPress: props.onSkipNextItem,
      };
  }
};

export const NowPlayingTransportRow = (props: NowPlayingTransportRowProps) => {
  const controls = getNowPlayingTransportControls(
    props.supportsQueueNavigation,
  );
  const playbackToggle = getPlaybackToggleControlModel({
    playbackToggleLabel: props.playbackToggleLabel,
    title: props.title,
  });

  return (
    <View style={styles.transportRow}>
      {controls.map((control) => {
        const button: TransportButtonModel =
          control === 'toggle-playback'
            ? {
                accessibilityLabel: playbackToggle.accessibilityLabel,
                disabled: props.isPlaybackToggleDisabled,
                icon: playbackToggle.iconName,
                onPress: props.onTogglePlayback,
                selected: playbackToggle.selected,
              }
            : getSecondaryButton(control, props);

        return (
          <TransportButton button={button} control={control} key={control} />
        );
      })}
    </View>
  );
};
