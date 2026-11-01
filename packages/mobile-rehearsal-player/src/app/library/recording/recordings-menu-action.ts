import type { OptionsMenuAction } from '../components/options-menu-sheet/model';
import { requestSavedItemAction } from '../components/saved-item-menu/saved-item-requests';
import { recordingsStorageSupported } from './recording-capabilities';
import { RECORDINGS_MENU_LABEL } from './recordings-panel-model';

/** What a Library menu needs to offer recordings for one item. */
export type RecordingsMenuState = {
  /** Opens the Recordings panel for the item. */
  onOpenRecordings: () => void;
};

/** The `Recordings` action of a saved-item menu; always reads `Recordings`. */
export const resolveRecordingsMenuActions = (
  recordings: RecordingsMenuState | undefined,
  idPrefix: string,
): OptionsMenuAction[] => {
  if (!recordings) {
    return [];
  }

  return [
    {
      id: `${idPrefix}:recordings`,
      label: RECORDINGS_MENU_LABEL,
      onPress: recordings.onOpenRecordings,
      tone: 'secondary',
    },
  ];
};

/**
 * Menu state for a track or adjusted track (by source id) or a loop (by loop
 * id), or nothing where recordings cannot be stored or listed.
 */
export const createRecordingsMenuState = (
  options: { id: string; kind: 'loop' | 'track' },
  isSupported: () => boolean = recordingsStorageSupported,
): RecordingsMenuState | undefined => {
  if (!isSupported()) {
    return undefined;
  }

  return {
    onOpenRecordings: () => {
      requestSavedItemAction({
        action: 'recordings',
        id: options.id,
        kind: options.kind,
      });
    },
  };
};
