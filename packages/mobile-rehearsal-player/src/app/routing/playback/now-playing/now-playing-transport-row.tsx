import { View } from 'react-native';

import type { AppIconName } from '../../../components/app-icon';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import {
  getNowPlayingTransportControls,
  type NowPlayingTransportControl,
} from './now-playing-model';
import { nowPlayingStyles as styles } from './styles';
import { getPlaybackToggleControlModel } from '../playback-toggle-control-model';

const QUEUED_TRANSPORT_ICON_SIZE = 22;
const STANDALONE_TRANSPORT_ICON_SIZE = 24;
const PLAYBACK_TOGGLE_ICON_SIZE = 32;

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

type TransportButton = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: AppIconName;
  onPress: () => void;
};

const getSecondaryButton = (
  control: Exclude<NowPlayingTransportControl, 'toggle-playback'>,
  props: NowPlayingTransportRowProps,
): TransportButton => {
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
  const secondaryIconSize = props.supportsQueueNavigation
    ? QUEUED_TRANSPORT_ICON_SIZE
    : STANDALONE_TRANSPORT_ICON_SIZE;
  const playbackToggle = getPlaybackToggleControlModel({
    playbackToggleLabel: props.playbackToggleLabel,
    title: props.title,
  });

  return (
    <View style={styles.transportRow}>
      {controls.map((control) => {
        if (control === 'toggle-playback') {
          return (
            <SurfaceIconButton
              accessibilityLabel={playbackToggle.accessibilityLabel}
              disabled={props.isPlaybackToggleDisabled}
              icon={playbackToggle.iconName}
              key={control}
              onPress={props.onTogglePlayback}
              selected={playbackToggle.selected}
              size={PLAYBACK_TOGGLE_ICON_SIZE}
              tone="primary"
            />
          );
        }

        const button = getSecondaryButton(control, props);

        return (
          <SurfaceIconButton
            accessibilityLabel={button.accessibilityLabel}
            disabled={button.disabled}
            icon={button.icon}
            key={control}
            onPress={button.onPress}
            size={secondaryIconSize}
          />
        );
      })}
    </View>
  );
};
