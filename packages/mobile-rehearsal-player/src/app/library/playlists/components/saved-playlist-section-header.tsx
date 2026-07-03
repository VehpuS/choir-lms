import { Pressable, Text } from 'react-native';

import { SectionHeading } from '../../components/section-heading';
import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';

type SavedPlaylistSectionHeaderProps = {
  canMutatePlaylists: boolean;
  isMutating: boolean;
  onOpenCreateDialog: () => void;
};

export const SavedPlaylistSectionHeader = ({
  canMutatePlaylists,
  isMutating,
  onOpenCreateDialog,
}: SavedPlaylistSectionHeaderProps) => {
  return (
    <SectionHeading
      style={styles.sectionCopy}
      title="Playlists"
      titleStyle={styles.sectionTitle}
      trailingAction={
        canMutatePlaylists ? (
          <Pressable
            accessibilityLabel="Create playlist"
            accessibilityRole="button"
            disabled={isMutating}
            onPress={onOpenCreateDialog}
            style={({ pressed }) => [
              styles.compactIconButton,
              pressed && !isMutating ? styles.actionButtonPressed : undefined,
              isMutating ? styles.actionButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>+</Text>
          </Pressable>
        ) : null
      }
    />
  );
};
