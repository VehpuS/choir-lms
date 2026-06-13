import { StyleSheet } from 'react-native';

import { playlistActionFeedbackStyles } from './action-feedback-styles';
import { playlistRowStyles } from './playlist-row-styles';
import { playlistSectionCardStyles } from './section-card-styles';

export { SAVED_PLAYLIST_PLACEHOLDER_TEXT } from './shared';

export const savedPlaylistSectionStyles = StyleSheet.create({
  ...playlistSectionCardStyles,
  ...playlistRowStyles,
  ...playlistActionFeedbackStyles,
});