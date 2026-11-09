import { View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import { buildPhaseLines, pluralize } from './bundle-flow-model';
import { PhaseList, SheetText } from './bundle-sheet-parts';
import type { useRestoreImportFlow } from './use-restore-import-flow';

type Flow = ReturnType<typeof useRestoreImportFlow>;

const FOOTER_GAP = 8;

const Footer = ({ children }: { children: React.ReactNode }) => (
  <View style={{ gap: FOOTER_GAP }}>{children}</View>
);

export const RestoreImportResultSteps = ({
  flow,
  onOpenAccessGuide,
}: {
  flow: Flow;
  onOpenAccessGuide: () => void;
}) => {
  const { state } = flow;
  const closeButton = (label = 'Close') => (
    <OutlinedActionButton label={label} onPress={flow.close} />
  );

  switch (state.step) {
    case 'running':
      return (
        <BottomSheetSurface
          footer={
            state.kind === 'replace' &&
            state.phase === 'replacing' ? undefined : (
              <OutlinedActionButton label="Cancel" onPress={flow.cancel} />
            )
          }
          isVisible
          onClose={flow.cancel}
          title={
            state.kind === 'replace'
              ? 'Replacing your library…'
              : 'Adding to your library…'
          }
        >
          {state.kind === 'replace' ? (
            <PhaseList
              lines={buildPhaseLines('replace', state.phase, {
                includesRecordings: false,
              })}
            />
          ) : (
            <SheetText>
              Cancelling keeps what was already added; adding again won’t
              duplicate it.
            </SheetText>
          )}
        </BottomSheetSurface>
      );
    case 'import-done':
      return (
        <BottomSheetSurface
          footer={
            <Footer>
              {state.needsAccessCount > 0 ? (
                <OutlinedActionButton
                  label="See which files need access"
                  onPress={onOpenAccessGuide}
                  variant="accent"
                />
              ) : null}
              {closeButton('Done')}
            </Footer>
          }
          isVisible
          onClose={flow.close}
          title={
            state.failedMessage
              ? 'Added part of it'
              : state.wasCancelled
                ? 'Stopped'
                : 'Added'
          }
        >
          <FeedbackCard
            message={
              state.failedMessage
                ? `${state.failedMessage} What was added is valid; add it again to finish.`
                : state.wasCancelled
                  ? 'What was added is valid; add it again to finish.'
                  : `Added “${state.folderName}”.`
            }
            title={
              state.failedMessage
                ? 'Not everything was added'
                : 'Import finished'
            }
            tone={state.failedMessage ? 'warning' : 'ready'}
          />
          {state.needsAccessCount > 0 ? (
            <SheetText>
              {`${pluralize(state.needsAccessCount, 'file')} need${state.needsAccessCount === 1 ? 's' : ''} access.`}
            </SheetText>
          ) : null}
        </BottomSheetSurface>
      );
    case 'replace-done':
      return (
        <BottomSheetSurface
          footer={
            <OutlinedActionButton
              label="Done"
              onPress={flow.close}
              variant="accent"
            />
          }
          isVisible
          onClose={flow.close}
          title="Library replaced"
        >
          <FeedbackCard
            message="Your library is now the backup you chose."
            title="Replaced"
            tone="ready"
          />
          <SheetText>
            {`Changed your mind? Your previous library is saved as “${state.safetyBackupName}” in “Choir LMS / Backups”. Restore it with Replace my library to undo.`}
          </SheetText>
        </BottomSheetSurface>
      );
    case 'refused':
      return (
        <BottomSheetSurface
          footer={closeButton()}
          isVisible
          onClose={flow.close}
          title="Can’t open this file"
        >
          <FeedbackCard
            message={state.message}
            title="Not a usable bundle"
            tone="error"
          />
        </BottomSheetSurface>
      );
    case 'failed':
      return (
        <BottomSheetSurface
          footer={closeButton()}
          isVisible
          onClose={flow.close}
          title="Nothing was changed"
        >
          <FeedbackCard
            message={`${state.message}${state.librarySafe ? ' Your library is unchanged.' : ''}`}
            title="Couldn’t finish"
            tone="error"
          />
        </BottomSheetSurface>
      );
    default:
      return null;
  }
};
