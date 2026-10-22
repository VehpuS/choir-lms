import { useEffect, useState } from 'react';

import type { OptionsMenuAction } from '../../../components/options-menu-sheet/model';
import {
  MARKER_ROW_ACTION_LABELS,
  formatMarkerTime,
  type MarkerRow,
  type MarkerRowAction,
} from './model';
import type { MarkersSheetProps, OpenDialog } from './props';

const NOTICE_VISIBLE_MS = 5000;

const ROW_ACTION_ICONS: Record<
  MarkerRowAction,
  NonNullable<OptionsMenuAction['icon']>
> = {
  delete: 'trash-can-outline',
  'keep-as-marker': 'plus',
  'loop-to-next': 'repeat',
  move: 'swap-horizontal',
  'open-loop': 'repeat',
  rename: 'pencil-outline',
};

export type MarkersNotice = {
  action?: { label: string; onPress: () => void };
  message: string;
};

/** A just-added marker as a row, so `Rename` can open on it. */
const toRenameRow = (marker: {
  id: string;
  name: string;
  positionMs: number;
}): MarkerRow => ({
  key: `marker:${marker.id}`,
  name: marker.name,
  timeLabel: formatMarkerTime(marker.positionMs),
  positionMs: marker.positionMs,
  origin: 'explicit',
  isPastEnd: false,
  canJump: true,
  actions: [],
  markerId: marker.id,
});

/**
 * Dialog and notice state of the markers sheet, and the handlers that turn a
 * row action into a host call. The notice (an add confirmation, an error, or
 * the undo after a delete) clears itself after a few seconds.
 */
export const useMarkersSheetState = (props: MarkersSheetProps) => {
  const [dialog, setDialog] = useState<OpenDialog | null>(() => {
    const row = props.model.rows.find(
      ({ key }) => key === props.initialMenuRowKey,
    );

    return row ? { kind: 'menu', row } : null;
  });
  const [notice, setNotice] = useState<MarkersNotice | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => {
      setNotice(null);
    }, NOTICE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const addHere = () => {
    void props.onAddHere().then((result) => {
      if ('error' in result) {
        setNotice({ message: result.error });
        return;
      }

      const { marker } = result;

      setNotice({
        action: {
          label: 'Rename',
          onPress: () => {
            setNotice(null);
            setDialog({ kind: 'rename', row: toRenameRow(marker) });
          },
        },
        message: `Added ${marker.name}`,
      });
    });
  };

  const deleteMarker = (markerId: string) => {
    void props.onDelete(markerId).then((marker) => {
      if (!marker) {
        return;
      }

      setNotice({
        action: {
          label: 'Undo',
          onPress: () => {
            props.onRestore(marker);
            setNotice(null);
          },
        },
        message: `Deleted ${marker.name}`,
      });
    });
  };

  const runRowAction = (row: MarkerRow, action: MarkerRowAction) => {
    if (action === 'rename' || action === 'move') {
      setDialog({ kind: action, row });
      return;
    }

    setDialog(null);

    if (action === 'delete' && row.markerId) {
      deleteMarker(row.markerId);
    } else if (action === 'open-loop' && row.loopId) {
      props.onOpenLoop(row.loopId);
    } else if (action === 'keep-as-marker') {
      props.onKeepAsMarker(row);
    } else if (action === 'loop-to-next' && row.loopToNext) {
      props.onMakeLoop(row.loopToNext);
    }
  };

  const menuActions = (row: MarkerRow): OptionsMenuAction[] =>
    row.actions.map((action) => ({
      icon: ROW_ACTION_ICONS[action],
      id: `${row.key}:${action}`,
      label: MARKER_ROW_ACTION_LABELS[action],
      onPress: () => {
        runRowAction(row, action);
      },
      tone: action === 'delete' ? 'destructive' : 'secondary',
    }));

  return { addHere, dialog, menuActions, notice, setDialog };
};
