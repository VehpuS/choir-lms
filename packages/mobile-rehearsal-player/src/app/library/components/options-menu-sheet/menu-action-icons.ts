import type { AppIconName } from '../../../components/app-icon/model';
import type { OptionsMenuAction } from './model';

/**
 * The one action-to-icon map every options menu reads (task 8.96). Icons are
 * keyed by action label so an action looks the same on every surface that
 * offers it (Library views, Recents, Up Next, the playback sheet, the bulk
 * bar, the Files and create menus). Taking an item out of a collection
 * (`minus`) is deliberately distinct from deleting data
 * (`trash-can-outline`). Labels that are data (folder and playlist names,
 * `Copy here`) have no entry and render without an icon.
 */
export const MENU_ACTION_ICONS: Readonly<Record<string, AppIconName>> = {
  'Add items': 'plus',
  'Add to playlist': 'playlist-music-outline',
  'Add to queue': 'playlist-plus',
  'Add tracks from Drive': 'plus',
  'Checking Drive…': 'progress-clock',
  'Copy to folder': 'content-copy',
  'Create a copy': 'content-copy',
  'Create folder': 'folder-plus-outline',
  'Create playlist': 'playlist-music-outline',
  'Delete from folder': 'trash-can-outline',
  'Edit loop': 'repeat',
  'Edit tags': 'tag-outline',
  'Editing…': 'repeat',
  'Make loop': 'repeat',
  'Move to end': 'arrow-collapse-down',
  'Move to folder': 'swap-horizontal',
  'Move to position': 'list-numbers',
  'Move to start': 'arrow-collapse-up',
  'Open in Google Drive': 'open-in-new',
  Pause: 'pause',
  Play: 'play-outline',
  'Play next': 'skip-next-outline',
  'Playlists unavailable': 'playlist-music-outline',
  Reconnect: 'refresh',
  Remove: 'trash-can-outline',
  'Remove from library': 'trash-can-outline',
  'Remove from playlist': 'minus',
  'Remove from queue': 'minus',
  'Removing…': 'trash-can-outline',
  Rename: 'pencil-outline',
  'Rename playlist': 'pencil-outline',
  'Save as playlist': 'content-save-outline',
  'Save to library': 'plus',
  'Show in Add': 'folder-outline',
  'View in library': 'music-note-multiple-outline',
  'View track loops': 'format-list-bulleted',
};

/** An explicit `icon` wins; otherwise the shared map decides by label. */
export const resolveMenuActionIcon = (
  action: Pick<OptionsMenuAction, 'icon' | 'label'>,
): AppIconName | undefined => {
  return action.icon ?? MENU_ACTION_ICONS[action.label];
};
