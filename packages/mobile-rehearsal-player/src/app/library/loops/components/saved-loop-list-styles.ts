import { StyleSheet } from 'react-native';

export const SAVED_LOOP_PRIMARY_TEXT = '#1f1c17';

const BORDER_COLOR = '#d6d1c4';
const SAVED_LOOP_SECONDARY_TEXT = '#5f5647';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';

export const savedLoopListStyles = StyleSheet.create({
  loopGroup: {
    gap: 12,
  },
  loopGroupTitle: {
    color: SAVED_LOOP_PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  loopCard: {
    position: 'relative',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffdf8',
  },
  loopName: {
    color: SAVED_LOOP_PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  loopMetadata: {
    color: SAVED_LOOP_SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  loopMessage: {
    color: SAVED_LOOP_SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  playButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  playButtonLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  iconButton: {
    minWidth: 38,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    borderColor: BORDER_COLOR,
    backgroundColor: '#fffdf8',
  },
  secondaryButtonLabel: {
    color: SAVED_LOOP_PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
});
