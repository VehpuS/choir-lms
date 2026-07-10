import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

import { DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT } from './drive-library-source-group-styles';

export const driveExplorerListStyles = StyleSheet.create({
  folderMetadata: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  folderName: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  rowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  sourceErrorMessage: {
    color: '#8a2d1f',
    fontSize: 13,
    lineHeight: 18,
  },
  sourceMessage: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceMetadata: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceName: {
    color: DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
});
