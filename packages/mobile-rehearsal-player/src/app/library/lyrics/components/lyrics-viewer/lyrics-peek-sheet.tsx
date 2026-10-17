import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { appTheme } from '../../../../utils/theme';
import { BottomSheetSurface } from '../../../components/bottom-sheet-surface';
import {
  resolveLyricsTextStyle,
  useLyricsTextSize,
} from '../../lyrics-text-size';
import { resolveLyricsPeekMaxHeight } from './model';

type LyricsPeekSheetProps = {
  onClose: () => void;
  onEdit: () => void;
  onExpand: () => void;
  ownerName: string;
  text: string;
};

/** Half-height lyrics over the current screen, for a quick look mid-rehearsal. */
export const LyricsPeekSheet = ({
  onClose,
  onEdit,
  onExpand,
  ownerName,
  text,
}: LyricsPeekSheetProps) => {
  const { height } = useWindowDimensions();
  const textStyle = resolveLyricsTextStyle(useLyricsTextSize());

  return (
    <BottomSheetSurface
      eyebrow="Lyrics"
      isVisible
      onClose={onClose}
      title={ownerName}
    >
      <ScrollView
        style={[
          darkScrollbarStyle,
          { maxHeight: resolveLyricsPeekMaxHeight(height) },
        ]}
      >
        <Text selectable style={textStyle}>
          {text}
        </Text>
      </ScrollView>
      <View style={styles.actions}>
        <OutlinedActionButton fill label="Edit" onPress={onEdit} />
        <OutlinedActionButton
          fill
          icon="arrow-collapse-up"
          label="Expand"
          onPress={onExpand}
          variant="accent"
        />
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
});
