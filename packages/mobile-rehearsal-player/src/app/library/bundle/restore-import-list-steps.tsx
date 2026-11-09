import { View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import { buildImportRows, buildRestoreRows } from './bundle-flow-model';
import { ChoiceRow, ListRow, SheetText } from './bundle-sheet-parts';
import type { useRestoreImportFlow } from './use-restore-import-flow';

type Flow = ReturnType<typeof useRestoreImportFlow>;

const FOOTER_GAP = 8;

const Footer = ({ children }: { children: React.ReactNode }) => (
  <View style={{ gap: FOOTER_GAP }}>{children}</View>
);

export const RestoreImportListSteps = ({
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
    case 'loading':
    case 'reading':
      return (
        <BottomSheetSurface
          footer={<OutlinedActionButton label="Cancel" onPress={flow.close} />}
          isVisible
          onClose={flow.close}
          title={state.step === 'loading' ? 'Looking in Drive…' : 'Opening…'}
        >
          <SheetText>This only takes a moment.</SheetText>
        </BottomSheetSurface>
      );
    case 'list': {
      const isRestore = state.mode === 'restore';
      const restoreRows = buildRestoreRows(state.bundles);
      const importRows = buildImportRows(state.bundles);

      return (
        <BottomSheetSurface
          footer={closeButton('Cancel')}
          isVisible
          onClose={flow.close}
          scrollable
          title={isRestore ? 'Restore from backup' : 'Import shared library'}
        >
          {isRestore ? (
            restoreRows.length === 0 ? (
              <FeedbackCard
                message="Back up your library to keep a copy you can restore later."
                title="No backups yet"
              />
            ) : (
              restoreRows.map((row) => (
                <ListRow
                  icon="content-save-outline"
                  key={row.id}
                  meta={row.meta}
                  onPress={() => void flow.pick('restore', row.listing)}
                  tag={row.tag}
                  title={row.title}
                />
              ))
            )
          ) : importRows.shared.length + importRows.mine.length === 0 ? (
            <FeedbackCard
              message="Ask whoever shared a library to share the file with you in Drive."
              title="Nothing to import yet"
            />
          ) : (
            <>
              {importRows.shared.length > 0 ? (
                <SheetText>Shared with me</SheetText>
              ) : null}
              {importRows.shared.map((row) => (
                <ListRow
                  icon="folder-outline"
                  key={row.id}
                  meta={row.meta}
                  onPress={() => void flow.pick('import', row.listing)}
                  title={row.title}
                />
              ))}
              {importRows.mine.length > 0 ? (
                <SheetText>My bundles</SheetText>
              ) : null}
              {importRows.mine.map((row) => (
                <ListRow
                  icon="content-save-outline"
                  key={row.id}
                  meta={row.meta}
                  onPress={() => void flow.pick('import', row.listing)}
                  title={row.title}
                />
              ))}
            </>
          )}
        </BottomSheetSurface>
      );
    }
    case 'choose':
      return (
        <BottomSheetSurface
          footer={
            <Footer>
              <OutlinedActionButton
                disabled={state.choice === null}
                label="Continue"
                onPress={flow.continueChoice}
                variant="accent"
              />
              {closeButton('Cancel')}
            </Footer>
          }
          isVisible
          onClose={flow.close}
          title={state.read.bundleName}
        >
          <ChoiceRow
            checked={state.choice === 'add'}
            detail="Imported into a new folder. Nothing you have changes."
            kind="radio"
            onPress={() => flow.choose('add')}
            title="Add to my library"
          />
          <ChoiceRow
            checked={state.choice === 'replace'}
            detail="Your library becomes this backup. A backup of the current one is saved first."
            kind="radio"
            onPress={() => flow.choose('replace')}
            title="Replace my library"
          />
        </BottomSheetSurface>
      );
    default:
      return null;
  }
};
