import { StyleSheet, Text, View } from 'react-native';
import type { Icon } from 'phosphor-react-native';
// Per-icon imports keep Metro from bundling all ~1,500 Phosphor glyphs, since
// Metro does not tree-shake the package's barrel export.
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
import { ClockCountdownIcon } from 'phosphor-react-native/src/icons/ClockCountdown';
import { ClockCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ClockCounterClockwise';
import { DotsSixVerticalIcon } from 'phosphor-react-native/src/icons/DotsSixVertical';
import { DotsThreeVerticalIcon } from 'phosphor-react-native/src/icons/DotsThreeVertical';
import { FolderIcon } from 'phosphor-react-native/src/icons/Folder';
import { FolderPlusIcon } from 'phosphor-react-native/src/icons/FolderPlus';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { MusicNoteIcon } from 'phosphor-react-native/src/icons/MusicNote';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { PauseIcon } from 'phosphor-react-native/src/icons/Pause';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlayCircleIcon } from 'phosphor-react-native/src/icons/PlayCircle';
import { PlaylistIcon } from 'phosphor-react-native/src/icons/Playlist';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { QueueIcon } from 'phosphor-react-native/src/icons/Queue';
import { RepeatIcon } from 'phosphor-react-native/src/icons/Repeat';
import { RepeatOnceIcon } from 'phosphor-react-native/src/icons/RepeatOnce';
import { ShuffleIcon } from 'phosphor-react-native/src/icons/Shuffle';
import { SkipBackIcon } from 'phosphor-react-native/src/icons/SkipBack';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { SortAscendingIcon } from 'phosphor-react-native/src/icons/SortAscending';
import { SortDescendingIcon } from 'phosphor-react-native/src/icons/SortDescending';
import { SpeakerHighIcon } from 'phosphor-react-native/src/icons/SpeakerHigh';
import { SpeakerLowIcon } from 'phosphor-react-native/src/icons/SpeakerLow';
import { SpeakerXIcon } from 'phosphor-react-native/src/icons/SpeakerX';
import { TagIcon } from 'phosphor-react-native/src/icons/Tag';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';

import {
  resolveAppIconGlyph,
  resolveSkipSecondsLabelSize,
  type AppIconName,
  type PhosphorGlyph,
} from './model';

export type { AppIconName } from './model';

const PHOSPHOR_COMPONENTS: Record<PhosphorGlyph, Icon> = {
  ArrowClockwise: ArrowClockwiseIcon,
  ArrowCounterClockwise: ArrowCounterClockwiseIcon,
  ArrowsClockwise: ArrowsClockwiseIcon,
  CaretDown: CaretDownIcon,
  CaretLeft: CaretLeftIcon,
  CaretRight: CaretRightIcon,
  CaretUp: CaretUpIcon,
  CheckCircle: CheckCircleIcon,
  Circle: CircleIcon,
  ClockCountdown: ClockCountdownIcon,
  ClockCounterClockwise: ClockCounterClockwiseIcon,
  DotsSixVertical: DotsSixVerticalIcon,
  DotsThreeVertical: DotsThreeVerticalIcon,
  Folder: FolderIcon,
  FolderPlus: FolderPlusIcon,
  MagnifyingGlass: MagnifyingGlassIcon,
  Minus: MinusIcon,
  MusicNote: MusicNoteIcon,
  MusicNotes: MusicNotesIcon,
  Pause: PauseIcon,
  Play: PlayIcon,
  PlayCircle: PlayCircleIcon,
  Playlist: PlaylistIcon,
  Plus: PlusIcon,
  Queue: QueueIcon,
  Repeat: RepeatIcon,
  RepeatOnce: RepeatOnceIcon,
  Shuffle: ShuffleIcon,
  SkipBack: SkipBackIcon,
  SkipForward: SkipForwardIcon,
  SlidersHorizontal: SlidersHorizontalIcon,
  SortAscending: SortAscendingIcon,
  SortDescending: SortDescendingIcon,
  SpeakerHigh: SpeakerHighIcon,
  SpeakerLow: SpeakerLowIcon,
  SpeakerX: SpeakerXIcon,
  Tag: TagIcon,
  UserCircle: UserCircleIcon,
  X: XIcon,
  XCircle: XCircleIcon,
};

export type AppIconProps = {
  color: string;
  name: AppIconName;
  size: number;
};

export const AppIcon = ({ color, name, size }: AppIconProps) => {
  const { glyph, skipSeconds, weight } = resolveAppIconGlyph(name);
  const PhosphorIcon = PHOSPHOR_COMPONENTS[glyph];
  const icon = <PhosphorIcon color={color} size={size} weight={weight} />;

  if (skipSeconds === undefined) {
    return icon;
  }

  return (
    <View style={{ width: size, height: size }}>
      {icon}
      <View pointerEvents="none" style={styles.skipSecondsOverlay}>
        <Text
          allowFontScaling={false}
          style={[
            styles.skipSecondsLabel,
            { color, fontSize: resolveSkipSecondsLabelSize(size) },
          ]}
        >
          {skipSeconds}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skipSecondsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipSecondsLabel: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
