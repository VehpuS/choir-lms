import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { requestFilesCreateMenu } from './files-create-menu-request';
import { FILES_EMPTY_FOLDER_MESSAGE } from './files-empty-folder-model';

export const FilesEmptyFolder = () => (
  <View style={styles.container}>
    <Text style={styles.message}>{FILES_EMPTY_FOLDER_MESSAGE}</Text>
    <OutlinedActionButton
      icon="plus"
      label="Create or add"
      onPress={requestFilesCreateMenu}
      style={styles.action}
      variant="accent"
    />
  </View>
);

const styles = StyleSheet.create({
  action: {
    alignSelf: 'flex-start',
  },
  container: {
    gap: appTheme.space.sm,
    paddingVertical: appTheme.space.sm,
  },
  message: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
});
