import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import type { OptionsMenuAction } from '../../../components/options-menu-sheet/model';
import { MoveMarkerDialog, RenameMarkerDialog } from './marker-dialogs';
import type { MarkerRow } from './model';
import type { MarkersSheetProps, OpenDialog } from './props';

type MarkerRowDialogsProps = {
  dialog: OpenDialog | null;
  menuActions: (row: MarkerRow) => OptionsMenuAction[];
  onClose: () => void;
  sheet: Pick<
    MarkersSheetProps,
    'currentPositionMs' | 'durationMs' | 'onMove' | 'onRename'
  >;
};

/** The row action menu and the rename / move dialogs opened from it. */
export const MarkerRowDialogs = ({
  dialog,
  menuActions,
  onClose,
  sheet,
}: MarkerRowDialogsProps) => {
  if (!dialog) {
    return null;
  }

  const { row } = dialog;

  if (dialog.kind === 'menu') {
    return (
      <OptionsMenuSheet
        actions={menuActions(row)}
        isVisible
        onClose={onClose}
        title={row.name}
      />
    );
  }

  if (dialog.kind === 'rename') {
    return (
      <RenameMarkerDialog
        initialName={row.name}
        onCancel={onClose}
        onSubmit={(name) => {
          if (row.markerId) {
            sheet.onRename(row.markerId, name);
          }

          onClose();
        }}
      />
    );
  }

  return (
    <MoveMarkerDialog
      currentPositionMs={sheet.currentPositionMs}
      durationMs={sheet.durationMs}
      initialPositionMs={row.positionMs}
      name={row.name}
      onCancel={onClose}
      onSubmit={(positionMs) => {
        if (row.markerId) {
          sheet.onMove(row.markerId, positionMs);
        }

        onClose();
      }}
    />
  );
};
