import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppIcon, type AppIconName } from '../../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { loopEditorStyles as styles } from './styles';

const RING_GLYPH_SIZE = 30;
const SEEK_GLYPH_SIZE = 26;

type LoopEditorTransportProps = {
  canSeek: boolean;
  canSetBoundaryFromPosition: boolean;
  isPreviewLoading: boolean;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSetBoundaryFromPosition: (boundary: 'end' | 'start') => void;
  onTogglePreview: () => void;
  previewActionLabel: string;
  previewDisabled: boolean;
  previewIconName: AppIconName;
};

const SeekButton = ({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: AppIconName;
  onPress: () => void;
}) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...interactionGuardProps}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transportButton,
        styles.transportSeek,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <AppIcon
        color={appTheme.colors.text}
        name={icon}
        size={SEEK_GLYPH_SIZE}
      />
    </Pressable>
  );
};

// The preview transport (1g): the same ring and ±15 s jumps as the playback
// sheet, plus setting either edge from where the preview is.
export const LoopEditorTransport = ({
  canSeek,
  canSetBoundaryFromPosition,
  isPreviewLoading,
  onSeekBackward,
  onSeekForward,
  onSetBoundaryFromPosition,
  onTogglePreview,
  previewActionLabel,
  previewDisabled,
  previewIconName,
}: LoopEditorTransportProps) => {
  return (
    <View style={{ gap: appTheme.space.lg }}>
      <View style={styles.transportRow}>
        <SeekButton
          accessibilityLabel="Back 15 seconds"
          disabled={!canSeek}
          icon="rewind-15"
          onPress={onSeekBackward}
        />
        <Pressable
          accessibilityLabel={previewActionLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: previewDisabled }}
          {...interactionGuardProps}
          disabled={previewDisabled}
          onPress={onTogglePreview}
          style={({ pressed }) => [
            styles.transportButton,
            styles.transportRing,
            buttonInteractionGuardStyle,
            pressed && !previewDisabled ? styles.pressed : null,
            previewDisabled ? styles.disabled : null,
          ]}
        >
          {isPreviewLoading ? (
            <ActivityIndicator color={appTheme.colors.accentText} />
          ) : (
            <AppIcon
              color={appTheme.colors.accentText}
              name={previewIconName}
              size={RING_GLYPH_SIZE}
            />
          )}
        </Pressable>
        <SeekButton
          accessibilityLabel="Forward 15 seconds"
          disabled={!canSeek}
          icon="fast-forward-15"
          onPress={onSeekForward}
        />
      </View>
      <View style={styles.boundaryRow}>
        <OutlinedActionButton
          accessibilityLabel="Set start here"
          disabled={!canSetBoundaryFromPosition}
          fill
          label="Set start here"
          onPress={() => {
            onSetBoundaryFromPosition('start');
          }}
        />
        <OutlinedActionButton
          accessibilityLabel="Set end here"
          disabled={!canSetBoundaryFromPosition}
          fill
          label="Set end here"
          onPress={() => {
            onSetBoundaryFromPosition('end');
          }}
        />
      </View>
    </View>
  );
};
