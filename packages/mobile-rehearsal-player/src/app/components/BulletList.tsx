import { map } from 'es-toolkit/compat';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';

type BulletListProps = {
  items: string[];
};

export const BulletList = ({ items }: BulletListProps) => {
  return (
    <View style={styles.list}>
      {map(items, (item) => {
        return (
          <View key={item} style={styles.listItem}>
            <View style={styles.listMarker} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  listMarker: {
    width: 8,
    height: 8,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: appTheme.colors.listMarker,
  },
  listText: {
    flex: 1,
    color: appTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
});
