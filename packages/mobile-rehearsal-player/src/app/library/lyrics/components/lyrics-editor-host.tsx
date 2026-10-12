import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { subscribeToSavedItemRequests } from '../../components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  type LyricsItem,
  type useSourceLyrics,
} from '../hooks/use-source-lyrics';
import { createLrclibLyricsClient } from '../lyrics-lookup-client';
import {
  persistLyricsLookupDisclosureAcknowledged,
  restoreLyricsLookupDisclosureAcknowledged,
} from '../lyrics-preferences-storage';
import { LyricsEditorSheet } from './lyrics-editor-sheet';

type LyricsEditorHostProps = {
  library: {
    lyrics: ReturnType<typeof useSourceLyrics>;
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
  };
};

/**
 * Opens the lyrics editor when any menu asks for it over the saved-item
 * request channel, for a track or a loop; the editor always edits the lyrics
 * of the track that owns them (design Decision 2).
 */
export const LyricsEditorHost = ({ library }: LyricsEditorHostProps) => {
  const { lyrics, savedLoops, savedLibrarySources: savedSources } = library;
  const [item, setItem] = useState<LyricsItem | null>(null);
  const [hasAcknowledgedDisclosure, setHasAcknowledgedDisclosure] = useState<
    boolean | null
  >(null);
  const lookupClient = useMemo(() => {
    return createLrclibLyricsClient({ fetch: (url, init) => fetch(url, init) });
  }, []);

  useEffect(() => {
    void restoreLyricsLookupDisclosureAcknowledged().then(
      setHasAcknowledgedDisclosure,
    );
  }, []);

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action !== 'edit-lyrics') {
        return;
      }

      if (request.kind === 'loop') {
        const loop = savedLoops.find(({ id }) => id === request.id);

        setItem(loop ? { id: loop.id, sourceId: loop.sourceId } : null);
        return;
      }

      const source = savedSources.find(({ id }) => id === request.id);

      setItem(source ?? null);
    });
  }, [savedLoops, savedSources]);

  const resolution = item ? lyrics.lyricsFor(item) : null;

  // Wait for the stored acknowledgement so the sheet opens in its final state.
  if (!item || !resolution?.owner || hasAcknowledgedDisclosure === null) {
    return null;
  }

  const close = () => {
    setItem(null);
  };

  return (
    <LyricsEditorSheet
      hasAcknowledgedDisclosure={hasAcknowledgedDisclosure}
      isVisible
      lookupClient={lookupClient}
      lyrics={resolution.lyrics}
      onAcknowledgeDisclosure={() => {
        setHasAcknowledgedDisclosure(true);
        void persistLyricsLookupDisclosureAcknowledged();
      }}
      onClose={close}
      onDelete={async () => {
        if (await lyrics.clearLyrics(item)) {
          close();
        }
      }}
      onOpenWebSearch={(url) => {
        void Linking.openURL(url);
      }}
      onSave={async (change) => {
        if (await lyrics.saveLyrics(item, change)) {
          close();
        }
      }}
      ownerName={resolution.owner.name}
      trackDurationMs={resolution.owner.durationMs}
    />
  );
};
