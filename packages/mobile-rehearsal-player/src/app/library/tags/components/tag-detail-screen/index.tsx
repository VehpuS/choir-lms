import { StyleSheet, View } from 'react-native';

import { ExplorerNavigationBar } from '../../../components/explorer';

const TAG_DETAIL_EYEBROW = 'Tag';

type TagDetailScreenProps = {
  onClose: () => void;
  tag: string;
};

export const TagDetailScreen = ({ onClose, tag }: TagDetailScreenProps) => {
  return (
    <View style={styles.surface}>
      <ExplorerNavigationBar
        canGoBack
        eyebrow={TAG_DETAIL_EYEBROW}
        onGoBack={onClose}
        title={tag}
      />
      <View style={styles.body} />
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    gap: 12,
  },
  body: {
    flex: 1,
  },
});
