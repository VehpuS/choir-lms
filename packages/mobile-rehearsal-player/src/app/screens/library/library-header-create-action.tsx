import { StyleSheet } from 'react-native';

import { SurfaceIconButton } from '../../components/surface-icon-button';
import { requestFilesCreateMenu } from '../../library/components/saved-rehearsal-library-section/files-create-menu-request';
import { appTheme } from '../../utils/theme';
import type { UseLibraryFilesResult } from '../../library/saved-rehearsal-library/use-library-files';
import { requestPlaylistCreateDialog } from './library-playlist-create-request';

export type LibraryCreateDockMode = 'files' | 'playlists' | null;

type LibraryHeaderCreateActionProps = {
  canMutatePlaylists: boolean;
  /** What the floating `+` would create: Files' menu, a playlist, or nothing. */
  dockMode: LibraryCreateDockMode;
  files: UseLibraryFilesResult;
  /** True while the floating `+` is in use (compact layout) or a bulk bar replaces it. */
  isHidden: boolean;
};

const ICON_SIZE = 18;

/**
 * The `+` of the Library's floating dock, as a header action: the wide-short
 * layout has too little height to let a floating button cover list rows. It
 * asks for the same menu or dialog the floating button opens.
 */
export const LibraryHeaderCreateAction = ({
  canMutatePlaylists,
  dockMode,
  files,
  isHidden,
}: LibraryHeaderCreateActionProps) => {
  if (isHidden) {
    return null;
  }

  const filesFolderLabel = files.explorer?.currentFolder.name ?? 'Files';

  if (dockMode === 'files') {
    return (
      <SurfaceIconButton
        accessibilityLabel={`Create in ${filesFolderLabel}`}
        icon="plus"
        onPress={requestFilesCreateMenu}
        size={ICON_SIZE}
        style={styles.button}
      />
    );
  }

  if (dockMode === 'playlists') {
    return (
      <SurfaceIconButton
        accessibilityLabel="Create playlist"
        disabled={!canMutatePlaylists}
        icon="plus"
        onPress={requestPlaylistCreateDialog}
        size={ICON_SIZE}
        style={styles.button}
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  button: {
    // Same circle as the header's other actions; the accent marks it as the
    // one that creates.
    borderColor: appTheme.colors.accent,
  },
});
