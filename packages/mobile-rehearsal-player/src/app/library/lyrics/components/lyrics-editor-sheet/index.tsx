import type {
  SourceLyrics,
  SourceLyricsOrigin,
} from '@org/audio-library-models';
import { useReducer } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { BottomSheetSurface } from '../../../components/bottom-sheet-surface';
import { useLibraryFilesConfirmationFlow } from '../../../selection/use-library-files-confirmation-flow';
import type { LyricsLookupClient } from '../../lyrics-lookup-client';
import { SearchSourceButton } from '../../../search-sources/search-source-button';
import { LyricsLookupResults } from './lyrics-lookup-results';
import { useLyricsLookup } from './use-lyrics-lookup';
import {
  canSaveLyrics,
  createLyricsEditorState,
  getLyricsAttribution,
  getLyricsCharacterCountLabel,
  hasStoredLyrics,
  hasUnsavedLyricsEdits,
  isLyricsEditorOverLimit,
  lyricsEditorReducer,
} from './model';
import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';

export type LyricsEditorSheetProps = {
  hasAcknowledgedDisclosure: boolean;
  isVisible: boolean;
  lookupClient: LyricsLookupClient;
  lyrics: SourceLyrics | undefined;
  /** The track that owns the lyrics (a loop or adjusted track edits its parent's). */
  ownerName: string;
  trackDurationMs?: number;
  onAcknowledgeDisclosure: () => void;
  onClose: () => void;
  onDelete: () => Promise<void> | void;
  onOpenWebSearch: (url: string) => void;
  onSave: (change: {
    origin: SourceLyricsOrigin;
    text: string;
  }) => Promise<void> | void;
};

const TITLE_PLACEHOLDER = 'Title';
const ARTIST_PLACEHOLDER = 'Artist';
const TEXT_PLACEHOLDER = 'Type or paste lyrics';

export const LyricsEditorSheet = ({
  hasAcknowledgedDisclosure,
  isVisible,
  lookupClient,
  lyrics,
  ownerName,
  trackDurationMs,
  onAcknowledgeDisclosure,
  onClose,
  onDelete,
  onOpenWebSearch,
  onSave,
}: LyricsEditorSheetProps) => {
  const [state, dispatch] = useReducer(
    lyricsEditorReducer,
    { hasAcknowledgedDisclosure, lyrics, trackName: ownerName },
    createLyricsEditorState,
  );
  const confirmation = useLibraryFilesConfirmationFlow();

  useLyricsLookup({
    dispatch,
    lookupClient,
    state,
    trackDurationMs,
  });

  if (!isVisible) {
    return null;
  }

  const requestClose = () => {
    if (!hasUnsavedLyricsEdits(state)) {
      onClose();
      return;
    }

    confirmation.requestConfirmation({
      content: {
        confirmLabel: 'Discard',
        message: 'Your edits to these lyrics have not been saved.',
        title: 'Discard changes?',
      },
      onConfirm: onClose,
    });
  };
  const requestDelete = () => {
    confirmation.requestConfirmation({
      content: {
        confirmLabel: 'Delete lyrics',
        message: `The lyrics for ${ownerName} will be removed from this device's library.`,
        title: 'Delete lyrics?',
      },
      onConfirm: onDelete,
    });
  };
  const attribution = getLyricsAttribution(state);
  const isOverLimit = isLyricsEditorOverLimit(state);
  const { lookup } = state;

  return (
    <BottomSheetSurface
      eyebrow="Lyrics"
      isVisible={true}
      onClose={requestClose}
      title={hasStoredLyrics(state) ? 'Edit lyrics' : 'Add lyrics'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={[darkScrollbarStyle, styles.scroll]}
      >
        <Text style={styles.bodyCopy}>{`Lyrics for ${ownerName}`}</Text>

        <TextInput
          accessibilityLabel="Title"
          autoCorrect={false}
          onChangeText={(title) => {
            dispatch({ title, type: 'title-changed' });
          }}
          placeholder={TITLE_PLACEHOLDER}
          placeholderTextColor={appTheme.colors.textFaint}
          style={styles.field}
          value={state.title}
        />
        <TextInput
          accessibilityLabel="Artist"
          autoCorrect={false}
          onChangeText={(artist) => {
            dispatch({ artist, type: 'artist-changed' });
          }}
          placeholder={ARTIST_PLACEHOLDER}
          placeholderTextColor={appTheme.colors.textFaint}
          style={styles.field}
          value={state.artist}
        />

        <View style={styles.actionRow}>
          <OutlinedActionButton
            disabled={state.title.trim().length === 0}
            icon="magnify"
            isBusy={lookup.status === 'loading'}
            label="Look up"
            onPress={() => {
              dispatch({ type: 'lookup-requested' });
            }}
          />
          <SearchSourceButton
            kind="lyrics"
            onOpen={onOpenWebSearch}
            query={{ artist: state.artist, title: state.title }}
          />
        </View>

        <LyricsLookupResults
          dispatch={dispatch}
          lookup={lookup}
          onAcknowledgeDisclosure={onAcknowledgeDisclosure}
          trackDurationMs={trackDurationMs}
        />

        <TextInput
          accessibilityLabel="Lyrics text"
          multiline
          onChangeText={(text) => {
            dispatch({ text, type: 'text-changed' });
          }}
          placeholder={TEXT_PLACEHOLDER}
          placeholderTextColor={appTheme.colors.textFaint}
          style={[styles.field, styles.textField]}
          textAlignVertical="top"
          value={state.text}
        />
        <Text
          style={[styles.counter, isOverLimit ? styles.counterOver : undefined]}
        >
          {getLyricsCharacterCountLabel(state)}
        </Text>
        {attribution ? (
          <Text style={styles.bodyCopy}>{attribution}</Text>
        ) : null}

        <View style={styles.actionRow}>
          <OutlinedActionButton fill label="Cancel" onPress={requestClose} />
          <OutlinedActionButton
            disabled={!canSaveLyrics(state)}
            fill
            label="Save"
            onPress={() => {
              void onSave({ origin: state.origin, text: state.text });
            }}
            variant="accent"
          />
        </View>
        {hasStoredLyrics(state) ? (
          <OutlinedActionButton
            label="Delete lyrics"
            onPress={requestDelete}
            variant="destructive"
          />
        ) : null}
      </ScrollView>
      {confirmation.confirmationDialog}
    </BottomSheetSurface>
  );
};

const TEXT_FIELD_MIN_HEIGHT = 160;

const styles = StyleSheet.create({
  // Look up, then the search with its dropdown on a row of its own: side by
  // side the source name was cut off on a phone.
  actionRow: {
    gap: appTheme.space.xs,
  },
  bodyCopy: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  content: {
    gap: appTheme.space.sm,
  },
  counter: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    textAlign: 'right',
  },
  counterOver: {
    color: appTheme.colors.danger,
  },
  field: {
    minHeight: appTheme.space.touchTarget,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.md,
    color: appTheme.colors.text,
    fontSize: 15,
    backgroundColor: appTheme.colors.surface,
  },
  scroll: {
    flexGrow: 0,
  },
  textField: {
    minHeight: TEXT_FIELD_MIN_HEIGHT,
    paddingVertical: appTheme.space.sm,
  },
});
