import type { RehearsalQueueMode } from '@org/audio-library-models';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { countLoopsBySourceId } from '../../saved-rehearsal-library/library-files-model/row-builders';
import { ExplorerListSurface } from '../explorer';
import {
  BrowseSourceRow,
  type BrowseSourceRowSharedProps,
} from './browse-source-row';
import { resolveTracksPlayAllItems } from './browse-source-row-model';
import type { SavedRehearsalLibrarySectionProps } from './types';

type BrowseSourceGroupProps = BrowseSourceRowSharedProps &
  Pick<
    SavedRehearsalLibrarySectionProps,
    'savedLoops' | 'toggleItemQueuePlayback'
  > & {
    savedSourceTitle: string;
    sources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
  };

// The Tracks view (screen 1c): a kicker heading, Play all / Shuffle over the
// tracks it shows, then numbered rows.
export const BrowseSourceGroup = ({
  savedLoops,
  savedSourceTitle,
  sources,
  toggleItemQueuePlayback,
  ...rowProps
}: BrowseSourceGroupProps) => {
  const [openMenuSourceId, setOpenMenuSourceId] = useState<string | null>(null);
  const loopCountBySourceId = useMemo(() => {
    return countLoopsBySourceId(savedLoops);
  }, [savedLoops]);
  const playAllItems = resolveTracksPlayAllItems(sources);

  if (sources.length === 0) {
    return null;
  }

  const startQueue = (mode: RehearsalQueueMode) => {
    void toggleItemQueuePlayback(playAllItems, { mode });
  };

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{savedSourceTitle}</Text>
      {playAllItems.length > 0 ? (
        <View style={styles.playActions}>
          <OutlinedActionButton
            disabled={rowProps.isPlaybackPreparing}
            fill
            icon="play"
            label="Play all"
            onPress={() => {
              startQueue('ordered');
            }}
            variant="accent"
          />
          <OutlinedActionButton
            disabled={rowProps.isPlaybackPreparing}
            fill
            icon="shuffle"
            label="Shuffle"
            onPress={() => {
              startQueue('shuffle');
            }}
          />
        </View>
      ) : null}
      <ExplorerListSurface>
        {sources.map((source, index) => {
          return (
            <BrowseSourceRow
              key={source.id}
              {...rowProps}
              index={index}
              isMenuOpen={openMenuSourceId === source.id}
              loopCount={loopCountBySourceId.get(source.id) ?? 0}
              onCloseMenu={() => {
                setOpenMenuSourceId(null);
              }}
              onOpenMenu={() => {
                setOpenMenuSourceId(source.id);
              }}
              source={source}
            />
          );
        })}
      </ExplorerListSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: appTheme.space.md,
  },
  groupTitle: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  playActions: {
    flexDirection: 'row',
    gap: appTheme.space.md,
  },
});
