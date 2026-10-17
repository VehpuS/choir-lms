import type { SheetMusicSource } from '@org/audio-library-models';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import {
  buildMuseScoreSearchUrl,
  type SheetMusicSearchSuggestion,
} from '../sheet-music-search-terms';
import { resolveLinkAddition, type LinkAddition } from './model';

type AddSheetMusicPanelProps = {
  /** The track's sources, so a link it already has is refused. */
  existingSources: readonly SheetMusicSource[];
  /** Offered once the Drive picker exists; hidden while it is absent. */
  onChooseDrive?: () => void;
  onAddLink: (addition: LinkAddition) => Promise<boolean>;
  onBack: () => void;
  onOpenExternal: (url: string) => void;
  /** The Title and Artist shown before the user edits them (from the track name). */
  suggestedQuery: SheetMusicSearchSuggestion;
};

type Mode = 'choices' | 'link';

/** The `Add sheet music` choices: a Drive file, a web link, or a MuseScore search. */
export const AddSheetMusicPanel = ({
  existingSources,
  onAddLink,
  onBack,
  onChooseDrive,
  onOpenExternal,
  suggestedQuery,
}: AddSheetMusicPanelProps) => {
  const [mode, setMode] = useState<Mode>('choices');
  const [title, setTitle] = useState(suggestedQuery.title);
  const [artist, setArtist] = useState(suggestedQuery.artist);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (mode === 'link') {
    const submit = async () => {
      const result = resolveLinkAddition({
        existing: existingSources,
        label,
        url,
      });

      if (result.status === 'refused') {
        setMessage(result.message);
        return;
      }

      setIsAdding(true);
      const wasAdded = await onAddLink(result.addition);

      setIsAdding(false);
      setMessage(wasAdded ? null : 'The link could not be added. Try again.');
    };

    return (
      <View style={styles.stack}>
        <TextInput
          accessibilityLabel="Web link"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={(text) => {
            setUrl(text);
            setMessage(null);
          }}
          placeholder="https://"
          placeholderTextColor={appTheme.colors.textFaint}
          style={styles.field}
          value={url}
        />
        <TextInput
          accessibilityLabel="Label"
          onChangeText={setLabel}
          placeholder="Label (optional)"
          placeholderTextColor={appTheme.colors.textFaint}
          style={styles.field}
          value={label}
        />
        <Text style={styles.copy}>
          Nothing is downloaded until you open it.
        </Text>
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <View style={styles.row}>
          <OutlinedActionButton
            fill
            label="Back"
            onPress={() => {
              setMode('choices');
              setMessage(null);
            }}
          />
          <OutlinedActionButton
            disabled={url.trim().length === 0}
            fill
            isBusy={isAdding}
            label="Add"
            onPress={() => {
              void submit();
            }}
            variant="accent"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {onChooseDrive ? (
        <OutlinedActionButton
          icon="folder-outline"
          label="From Google Drive"
          onPress={onChooseDrive}
        />
      ) : null}
      <OutlinedActionButton
        icon="open-in-new"
        label="From a web link"
        onPress={() => {
          setMode('link');
        }}
      />

      <Text style={styles.heading}>Search MuseScore</Text>
      <TextInput
        accessibilityLabel="Title"
        autoCorrect={false}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={appTheme.colors.textFaint}
        style={styles.field}
        value={title}
      />
      <TextInput
        accessibilityLabel="Artist"
        autoCorrect={false}
        onChangeText={setArtist}
        placeholder="Artist"
        placeholderTextColor={appTheme.colors.textFaint}
        style={styles.field}
        value={artist}
      />
      <OutlinedActionButton
        disabled={title.trim().length === 0}
        icon="magnify"
        label="Search MuseScore"
        onPress={() => {
          onOpenExternal(buildMuseScoreSearchUrl({ artist, title }));
        }}
        variant="accent"
      />
      <Text style={styles.copy}>
        Opens your browser. Bring a link or an exported file back here; the app
        never downloads from MuseScore.
      </Text>
      <OutlinedActionButton label="Back" onPress={onBack} />
    </View>
  );
};

const styles = StyleSheet.create({
  copy: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  error: {
    ...appTheme.type.body,
    color: appTheme.colors.danger,
    lineHeight: 20,
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
  heading: {
    ...appTheme.type.body,
    color: appTheme.colors.text,
    fontWeight: '600',
    marginTop: appTheme.space.xs,
  },
  row: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  stack: {
    gap: appTheme.space.sm,
  },
});
