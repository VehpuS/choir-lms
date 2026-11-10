import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { appTheme } from '../../utils/theme';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import {
  ACCESS_GUIDE_COPY,
  formatAccessGuideTitle,
  formatFolderHint,
} from './access-guide-model';
import { SheetText } from './bundle-sheet-parts';
import { pluralize } from './bundle-flow-model';
import type { useAccessGuideFlow } from './use-access-guide-flow';

type AccessGuideSheetProps = { flow: ReturnType<typeof useAccessGuideFlow> };

const COPY_RESULT_COPY = {
  copied: 'Copied.',
  failed: 'Couldn’t copy the list.',
} as const;

export const AccessGuideSheet = ({ flow }: AccessGuideSheetProps) => {
  const { state } = flow;

  if (state.step === 'closed') {
    return null;
  }

  const fileCount = state.groups.reduce(
    (total, group) => total + group.files.length,
    0,
  );

  return (
    <BottomSheetSurface
      footer={
        <View style={styles.footer}>
          <View style={styles.row}>
            <OutlinedActionButton
              disabled={fileCount === 0}
              fill
              label={ACCESS_GUIDE_COPY.copyList}
              onPress={() => void flow.copyList()}
            />
            <OutlinedActionButton
              fill
              isBusy={state.isChecking}
              label={ACCESS_GUIDE_COPY.checkAgain}
              onPress={() => void flow.checkAgain()}
              variant="accent"
            />
          </View>
          <OutlinedActionButton label="Close" onPress={flow.close} />
        </View>
      }
      isVisible
      onClose={flow.close}
      scrollable
      title={
        fileCount === 0
          ? 'Everything can be opened'
          : formatAccessGuideTitle(fileCount)
      }
    >
      {fileCount > 0 ? (
        <SheetText>{ACCESS_GUIDE_COPY.explanation}</SheetText>
      ) : null}
      {state.lastCheck ? (
        <FeedbackCard
          message={
            state.lastCheck.stillNeeding > 0
              ? `${pluralize(state.lastCheck.stillNeeding, 'file')} still can’t be opened.`
              : 'Nothing is left that needs access.'
          }
          title={
            state.lastCheck.recovered > 0
              ? `${pluralize(state.lastCheck.recovered, 'file')} can be opened now.`
              : 'Nothing new can be opened yet.'
          }
          tone={state.lastCheck.recovered > 0 ? 'ready' : 'neutral'}
        />
      ) : null}
      {state.groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.owner}>{group.ownerName}</Text>
          {group.ownerEmail ? (
            <Text style={styles.email}>{group.ownerEmail}</Text>
          ) : null}
          {group.folderHint ? (
            <SheetText>{formatFolderHint(group.folderHint)}</SheetText>
          ) : null}
          {group.files.map((file) => (
            <Text key={file.sourceId} style={styles.file}>
              {file.name}
            </Text>
          ))}
          <View style={styles.row}>
            <OutlinedActionButton
              fill
              icon="open-in-new"
              label={ACCESS_GUIDE_COPY.openInDrive}
              onPress={() =>
                flow.openUrl(group.folderHint?.url ?? group.files[0]?.url ?? '')
              }
            />
            {group.ownerEmail ? (
              <OutlinedActionButton
                fill
                label={ACCESS_GUIDE_COPY.emailOwner}
                onPress={() => flow.emailOwner(group)}
              />
            ) : null}
          </View>
        </View>
      ))}
      {state.copyResult ? (
        <SheetText>{COPY_RESULT_COPY[state.copyResult]}</SheetText>
      ) : null}
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  footer: { gap: appTheme.space.xs },
  row: { flexDirection: 'row', gap: appTheme.space.xs },
  group: {
    gap: appTheme.space.xs,
    paddingVertical: appTheme.space.md,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.hairline,
  },
  owner: { ...appTheme.type.rowTitle, color: appTheme.colors.text },
  email: { ...appTheme.type.rowMeta },
  file: { ...appTheme.type.body, color: appTheme.colors.textSecondary },
});
