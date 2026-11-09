import { Linking, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import {
  buildPhaseLines,
  buildRecordingPicker,
  describeShareLeftOut,
  pluralize,
  SHARE_OUTSIDE_COPY,
  type CountTile,
} from './bundle-flow-model';
import {
  ChoiceRow,
  CountTiles,
  PhaseList,
  SheetText,
} from './bundle-sheet-parts';
import type { useShareFlow } from './use-share-flow';

type ShareSheetProps = { flow: ReturnType<typeof useShareFlow> };

const FOOTER_GAP = 8;

export const ShareSheet = ({ flow }: ShareSheetProps) => {
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
          Sharing saves a file in your Drive that you then share with your
          singers. It can’t see or change your other files.
        </SheetText>
      </BottomSheetSurface>
    );
  }

  if (state.step === 'preview') {
    const { preview } = state;
    const picker = buildRecordingPicker(state.recordings, state.selected);
    const leftOut = describeShareLeftOut({
      includeOutside: state.includeOutside,
      leftOutReferenceCount: preview.leftOutReferenceCount,
      outsideItemCount: preview.outsideItemCount,
    });
    const tiles: CountTile[] = [
      {
        label: 'tracks',
        value:
          preview.counts.tracks +
          (state.includeOutside ? preview.outsideItemCount : 0),
      },
      { label: 'loops', value: preview.counts.loops },
      { label: 'playlists', value: preview.counts.playlists },
      { label: 'composites', value: preview.counts.composites },
      ...(state.includeOutside
        ? []
        : preview.leftOutReferenceCount > 0
          ? [
              {
                label: 'left out',
                value: preview.leftOutReferenceCount,
                tone: 'warn' as const,
              },
            ]
          : []),
    ];

    return (
      <BottomSheetSurface
        footer={
          <View style={{ gap: FOOTER_GAP }}>
            <OutlinedActionButton
              label="Save to Drive"
              onPress={() => void flow.start()}
              variant="accent"
            />
            <OutlinedActionButton label="Cancel" onPress={flow.close} />
          </View>
        }
        isVisible
        onClose={flow.close}
        scrollable
        title={`Share “${state.folderName}”`}
      >
        <SheetText>
          A file with the folder’s tracks, loops, playlists and composites. No
          audio is copied.
        </SheetText>
        <CountTiles tiles={tiles} />
        {leftOut ? (
          <FeedbackCard
            message={leftOut.detail}
            title={leftOut.headline}
            tone={leftOut.tone === 'ok' ? 'ready' : 'warning'}
          />
        ) : null}
        {preview.outsideItemCount > 0 ? (
          <ChoiceRow
            checked={state.includeOutside}
            detail={`Adds ${pluralize(preview.outsideItemCount, 'item')} at the top of the share, so playlists and composites play in full. ${SHARE_OUTSIDE_COPY.warning}`}
            kind="checkbox"
            onPress={() => flow.setIncludeOutside(!state.includeOutside)}
            title={SHARE_OUTSIDE_COPY.label}
          />
        ) : null}
        {picker.rows.length > 0 ? (
          <>
            <SheetText>
              Recordings are your own voice, so they are left out unless you
              choose them.
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
      </BottomSheetSurface>
    );
  }

  if (state.step === 'saving') {
    return (
      <BottomSheetSurface
        footer={<OutlinedActionButton label="Cancel" onPress={flow.cancel} />}
        isVisible
        onClose={flow.cancel}
        title="Saving share…"
      >
        <PhaseList
          lines={buildPhaseLines('share', state.phase, {
            includesRecordings: false,
          })}
        />
      </BottomSheetSurface>
    );
  }

  if (state.step === 'done') {
    return (
      <BottomSheetSurface
        footer={
          <View style={{ gap: FOOTER_GAP }}>
            <OutlinedActionButton
              icon="open-in-new"
              label="Open in Drive"
              onPress={() => void Linking.openURL(state.openUrl)}
              variant="accent"
            />
            <OutlinedActionButton label="Done" onPress={flow.close} />
          </View>
        }
        isVisible
        onClose={flow.close}
        title="Ready to share"
      >
        <FeedbackCard
          message={state.fileName}
          title="Saved to “Choir LMS / Shares”"
          tone="ready"
        />
        <SheetText>
          Open it in Drive and share it with your singers. They also need access
          to the audio files themselves; share the Drive folder that holds them
          if they don’t have it yet.
        </SheetText>
      </BottomSheetSurface>
    );
  }

  return (
    <BottomSheetSurface
      footer={<OutlinedActionButton label="Close" onPress={flow.close} />}
      isVisible
      onClose={flow.close}
      title="Share didn’t finish"
    >
      <FeedbackCard
        message={`${state.message} Nothing was saved.`}
        title="Not saved"
        tone="error"
      />
    </BottomSheetSurface>
  );
};
