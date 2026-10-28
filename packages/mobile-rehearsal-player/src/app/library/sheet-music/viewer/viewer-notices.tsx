import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { PartNotices } from './part-chips';
import type { ScoreInfo } from './sheet-music-surface-types';

type ViewerNoticesProps = {
  /** The score's part notices, when it has a choice of parts. */
  partInfo: ScoreInfo | null;
  /** `Following track pitch −2 st` while the track is shifted and the score is marked. */
  pitchOffsetLabel: string | null;
};

/** What the viewer says about the score: why parts differ, and the pitch offset in use. */
export const ViewerNotices = ({
  partInfo,
  pitchOffsetLabel,
}: ViewerNoticesProps) => {
  return (
    <View style={styles.notices}>
      {partInfo ? <PartNotices info={partInfo} /> : null}
      {pitchOffsetLabel ? (
        <Text style={styles.notice}>{pitchOffsetLabel}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  notice: { ...appTheme.type.rowMeta, color: appTheme.colors.accentText },
  notices: { gap: appTheme.space.xxs },
});
