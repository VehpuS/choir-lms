import type { SheetMusicSource } from '@org/audio-library-models';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import { useLibraryFilesConfirmationFlow } from '../../selection/use-library-files-confirmation-flow';
import { AddSheetMusicPanel } from './add-sheet-music-panel';
import {
  LIMIT_MESSAGE,
  hasReachedSheetMusicLimit,
  type LinkAddition,
} from './model';
import { SheetMusicRow } from './sheet-music-row';
import type { SheetMusicSearchSuggestion } from '../sheet-music-search-terms';
import { darkScrollbarStyle } from '../../../components/dark-scrollbar';

type SheetMusicManagerSheetProps = {
  canMutate: boolean;
  onAddLink: (addition: LinkAddition) => Promise<boolean>;
  onChooseDrive?: () => void;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
  onOpenSource: (source: SheetMusicSource) => void;
  onRemove: (source: SheetMusicSource) => Promise<boolean>;
  onRename: (source: SheetMusicSource, label: string) => Promise<boolean>;
  /** The track that owns the list (a loop or adjusted track opens its parent's). */
  ownerName: string;
  sources: readonly SheetMusicSource[];
  suggestedQuery: SheetMusicSearchSuggestion;
};

/** The `Sheet music` manager: the track's sources, `Add sheet music`, and the limit. */
export const SheetMusicManagerSheet = ({
  canMutate,
  onAddLink,
  onChooseDrive,
  onClose,
  onOpenExternal,
  onOpenSource,
  onRemove,
  onRename,
  ownerName,
  sources,
  suggestedQuery,
}: SheetMusicManagerSheetProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const confirmation = useLibraryFilesConfirmationFlow();
  const isAtLimit = hasReachedSheetMusicLimit(sources.length);

  const requestRemove = (source: SheetMusicSource) => {
    confirmation.requestConfirmation({
      content: {
        confirmLabel: 'Remove',
        message: `The link to ${source.label} will be removed from ${ownerName}. The file itself is not deleted.`,
        title: 'Remove sheet music?',
      },
      onConfirm: async () => {
        await onRemove(source);
      },
    });
  };

  return (
    <BottomSheetSurface
      eyebrow="Sheet music"
      isVisible={true}
      onClose={isAdding ? () => setIsAdding(false) : onClose}
      title={isAdding ? 'Add sheet music' : 'Sheet music'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={[darkScrollbarStyle, styles.scroll]}
      >
        <Text style={styles.copy}>{`Sheet music for ${ownerName}`}</Text>
        {isAdding ? (
          <AddSheetMusicPanel
            onAddLink={async (addition) => {
              const wasAdded = await onAddLink(addition);

              if (wasAdded) {
                setIsAdding(false);
              }

              return wasAdded;
            }}
            onBack={() => {
              setIsAdding(false);
            }}
            onChooseDrive={onChooseDrive}
            onOpenExternal={onOpenExternal}
            suggestedQuery={suggestedQuery}
          />
        ) : (
          <>
            {sources.length === 0 ? (
              <Text style={styles.copy}>
                No sheet music yet. Add a score or a part for this track.
              </Text>
            ) : null}
            {sources.map((source) => (
              <SheetMusicRow
                disabled={!canMutate}
                key={source.id}
                onAction={onOpenSource}
                onRemove={requestRemove}
                onRename={(row, label) => {
                  void onRename(row, label);
                }}
                source={source}
              />
            ))}
            {isAtLimit ? (
              <Text style={styles.copy}>{LIMIT_MESSAGE}</Text>
            ) : null}
            <OutlinedActionButton
              disabled={!canMutate || isAtLimit}
              icon="plus"
              label="Add sheet music"
              onPress={() => {
                setIsAdding(true);
              }}
              variant="accent"
            />
            <OutlinedActionButton label="Done" onPress={onClose} />
          </>
        )}
      </ScrollView>
      {confirmation.confirmationDialog}
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: appTheme.space.sm,
  },
  copy: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  scroll: {
    flexGrow: 0,
  },
});
