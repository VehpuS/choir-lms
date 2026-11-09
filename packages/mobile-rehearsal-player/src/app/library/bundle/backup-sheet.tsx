import { View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import {
  buildPhaseLines,
  buildRecordingPicker,
  pluralize,
  type CountTile,
} from './bundle-flow-model';
import {
  ChoiceRow,
  CountTiles,
  PhaseList,
  SheetText,
} from './bundle-sheet-parts';
import type { useBackupFlow } from './use-backup-flow';

type BackupSheetProps = { flow: ReturnType<typeof useBackupFlow> };

const FOOTER_GAP = 8;

export const BackupSheet = ({ flow }: BackupSheetProps) => {
  const { state } = flow;

  if (state.step === 'closed') {
    return null;
  }

  if (state.step === 'permission') {
    return (
      <BottomSheetSurface
        footer={
          <View style={{ gap: FOOTER_GAP }}>
            <OutlinedActionButton
              label="Allow saving to Drive"
              onPress={flow.allowSaving}
              variant="accent"
            />
            <OutlinedActionButton label="Not now" onPress={flow.close} />
          </View>
        }
        isVisible
        onClose={flow.close}
        title="Allow saving to Drive"
      >
        <SheetText>
          Backing up needs permission to save files it creates in your Drive. It
          can’t see or change your other files.
        </SheetText>
      </BottomSheetSurface>
    );
  }

  if (state.step === 'confirm') {
    const picker = buildRecordingPicker(state.recordings, state.selected);
    const tiles: CountTile[] = [
      { label: 'tracks', value: state.counts.tracks },
      { label: 'loops', value: state.counts.loops },
      { label: 'playlists', value: state.counts.playlists },
    ];

    return (
      <BottomSheetSurface
        footer={
          <View style={{ gap: FOOTER_GAP }}>
            <OutlinedActionButton
              label="Back up"
              onPress={() => void flow.start()}
              variant="accent"
            />
            <OutlinedActionButton label="Cancel" onPress={flow.close} />
          </View>
        }
        isVisible
        onClose={flow.close}
        scrollable
        title="Back up library"
      >
        <SheetText>Saved to Drive in “Choir LMS / Backups”.</SheetText>
        <CountTiles tiles={tiles} />
        {picker.rows.length > 0 ? (
          <>
            <SheetText>
              Recordings are left out unless you choose them.
            </SheetText>
            {picker.rows.map((row) => (
              <ChoiceRow
                checked={row.checked}
                detail={row.detail}
                key={row.id}
                kind="checkbox"
                onPress={() => flow.toggleRecording(row.id)}
                title={row.title}
              />
            ))}
            <SheetText>{picker.totalLabel}</SheetText>
          </>
        ) : null}
        <SheetText>
          Your 5 most recent backups are kept; older ones are removed after a
          new one is saved.
        </SheetText>
      </BottomSheetSurface>
    );
  }

  if (state.step === 'saving') {
    return (
      <BottomSheetSurface
        footer={<OutlinedActionButton label="Cancel" onPress={flow.cancel} />}
        isVisible
        onClose={flow.cancel}
        title="Saving backup…"
      >
        <PhaseList
          lines={buildPhaseLines('backup', state.phase, {
            includesRecordings: state.includesRecordings,
          })}
        />
      </BottomSheetSurface>
    );
  }

  if (state.step === 'done') {
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
        title="Backed up"
      >
        <FeedbackCard
          message={
            state.removedBackups > 0
              ? `${pluralize(state.removedBackups, 'older backup')} removed to keep your 5 most recent.`
              : 'Your library is saved in “Choir LMS / Backups”.'
          }
          title="Backup saved"
          tone="ready"
        />
      </BottomSheetSurface>
    );
  }

  return (
    <BottomSheetSurface
      footer={
        <View style={{ gap: FOOTER_GAP }}>
          <OutlinedActionButton
            label="Try again"
            onPress={flow.open}
            variant="accent"
          />
          <OutlinedActionButton label="Close" onPress={flow.close} />
        </View>
      }
      isVisible
      onClose={flow.close}
      title="Backup didn’t finish"
    >
      <FeedbackCard
        message={`${state.message} Nothing was saved, and your earlier backups are untouched.`}
        title="Not saved"
        tone="error"
      />
    </BottomSheetSurface>
  );
};
