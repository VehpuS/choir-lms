import { View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import {
  buildImportPreviewTiles,
  describeReplaceConfirmation,
  pluralize,
} from './bundle-flow-model';
import { ChoiceRow, CountTiles, SheetText } from './bundle-sheet-parts';
import { countBundleContents } from './read-bundle';
import type { useRestoreImportFlow } from './use-restore-import-flow';

type Flow = ReturnType<typeof useRestoreImportFlow>;

const FOOTER_GAP = 8;

const Footer = ({ children }: { children: React.ReactNode }) => (
  <View style={{ gap: FOOTER_GAP }}>{children}</View>
);

export const RestoreImportPreviewSteps = ({
  flow,
}: {
  flow: Flow;
  onOpenAccessGuide?: () => void;
}) => {
  const { state } = flow;
  const closeButton = (label = 'Close') => (
    <OutlinedActionButton label={label} onPress={flow.close} />
  );

  switch (state.step) {
    case 'preview': {
      const { tiles, droppedLine } = buildImportPreviewTiles(
        state.preview.plan,
        state.preview.droppedTotal,
      );

      return (
        <BottomSheetSurface
          footer={
            <Footer>
              <OutlinedActionButton
                label="Choose where to add it"
                onPress={() => void flow.chooseDestination()}
                variant="accent"
              />
              {closeButton('Cancel')}
            </Footer>
          }
          isVisible
          onClose={flow.close}
          scrollable
          title={
            state.read.bundle.scope.kind === 'folder'
              ? state.read.bundle.scope.name
              : 'Library'
          }
        >
          <SheetText>{`From ${state.read.bundle.author.name}. Nothing is added until you confirm.`}</SheetText>
          <CountTiles tiles={tiles} />
          {state.preview.plan.summary.needsAccessTracks > 0 ? (
            <FeedbackCard
              message="They’ll still be imported; you can ask the owner to share them afterwards."
              title={`${pluralize(state.preview.plan.summary.needsAccessTracks, 'file')} can’t be opened yet.`}
              tone="warning"
            />
          ) : null}
          {state.preview.accessUnchecked ? (
            <SheetText>
              Some files couldn’t be checked right now; you can check again
              after importing.
            </SheetText>
          ) : null}
          {droppedLine ? <SheetText>{droppedLine}</SheetText> : null}
        </BottomSheetSurface>
      );
    }
    case 'destination':
      return (
        <BottomSheetSurface
          footer={
            <Footer>
              <OutlinedActionButton
                label="Add here"
                onPress={() => void flow.startImport()}
                variant="accent"
              />
              {closeButton('Cancel')}
            </Footer>
          }
          isVisible
          onClose={flow.close}
          scrollable
          title="Add to…"
        >
          <SheetText>
            A new folder is created here. Your existing folders and tracks are
            not changed.
          </SheetText>
          {state.folders.map((folder) => (
            <View key={folder.id} style={{ paddingLeft: folder.depth * 12 }}>
              <ChoiceRow
                checked={state.destinationId === folder.id}
                kind="radio"
                onPress={() => flow.selectDestination(folder.id)}
                title={folder.name}
              />
            </View>
          ))}
        </BottomSheetSurface>
      );
    case 'confirm-replace': {
      const counts = {
        ...countBundleContents(state.read.bundle),
      };
      const copy = describeReplaceConfirmation({
        counts,
        isOwn: state.read.isOwn,
        authorName: state.read.bundle.author.name,
        uploadBytes: state.uploadBytes,
      });

      return (
        <BottomSheetSurface
          footer={
            <Footer>
              <OutlinedActionButton
                label={copy.confirmLabel}
                onPress={flow.confirmReplace}
                variant="destructive"
              />
              {closeButton('Cancel')}
            </Footer>
          }
          isVisible
          onClose={flow.close}
          title="Replace your library?"
        >
          <FeedbackCard
            message={copy.contents}
            title={copy.headline}
            tone="error"
          />
          {'fromLine' in copy && copy.fromLine ? (
            <SheetText>{copy.fromLine}</SheetText>
          ) : null}
          <SheetText>{copy.safety}</SheetText>
        </BottomSheetSurface>
      );
    }
    case 'permission':
      return (
        <BottomSheetSurface
          footer={
            <Footer>
              <OutlinedActionButton
                label="Allow saving to Drive"
                onPress={flow.allowSaving}
                variant="accent"
              />
              {closeButton('Not now')}
            </Footer>
          }
          isVisible
          onClose={flow.close}
          title="Allow saving to Drive"
        >
          <SheetText>
            Replacing first saves a backup of your current library, which needs
            permission to save files in your Drive.
          </SheetText>
        </BottomSheetSurface>
      );
    default:
      return null;
  }
};
