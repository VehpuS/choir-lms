import {
  buildSearchUrl,
  type SearchQuery,
  type SearchSourceKind,
} from '@org/audio-library-models';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { appTheme } from '../../utils/theme';
import { OptionsMenuSheet } from '../components/options-menu-sheet';
import { useSearchSources } from './search-sources-store';

const CHOOSE_LABEL = 'Choose where to search';
const MENU_TITLE = 'Search with';

type SearchSourceButtonProps = {
  disabled?: boolean;
  kind: SearchSourceKind;
  /** Opens the address in the system browser. */
  onOpen: (url: string) => void;
  query: SearchQuery;
};

/**
 * `Search <source>` for the Title and Artist, with a dropdown to search
 * somewhere else instead. The first source in Settings is the default; picking
 * another here searches with it and keeps it for the next press.
 */
export const SearchSourceButton = ({
  disabled = false,
  kind,
  onOpen,
  query,
}: SearchSourceButtonProps) => {
  const sources = useSearchSources(kind);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const selected = sources.find(({ id }) => id === chosenId) ?? sources[0];

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <OutlinedActionButton
          accessibilityLabel={`Search ${selected.label}`}
          disabled={disabled}
          fill
          icon="magnify"
          label={`Search ${selected.label}`}
          onPress={() => onOpen(buildSearchUrl(selected, query))}
          variant="accent"
        />
      </View>
      {sources.length > 1 ? (
        <SurfaceIconButton
          accessibilityLabel={CHOOSE_LABEL}
          icon="chevron-down"
          onPress={() => setIsMenuOpen(true)}
        />
      ) : null}
      <OptionsMenuSheet
        actions={sources.map((source) => ({
          disabled,
          id: source.id,
          label: source.label,
          onPress: () => {
            setIsMenuOpen(false);
            setChosenId(source.id);
            onOpen(buildSearchUrl(source, query));
          },
        }))}
        isVisible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title={MENU_TITLE}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  main: { flex: 1 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
  },
});
