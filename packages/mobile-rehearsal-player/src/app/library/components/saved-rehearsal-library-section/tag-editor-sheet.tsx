import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';

import { TagEditorSheet } from '../../components/tag-editor-sheet';
import type { useSavedRehearsalLibraryTagEditor } from './use-saved-rehearsal-library-tag-editor';

type SavedRehearsalLibraryTagEditorSheetProps = {
  availableTagUsage: RehearsalLibraryTagUsage[];
  tagEditor: ReturnType<typeof useSavedRehearsalLibraryTagEditor>;
};

export const SavedRehearsalLibraryTagEditorSheet = ({
  availableTagUsage,
  tagEditor,
}: SavedRehearsalLibraryTagEditorSheetProps) => {
  return (
    <TagEditorSheet
      availableTagUsage={availableTagUsage}
      isSaving={tagEditor.isTagEditorSaving}
      isVisible={tagEditor.isTagEditorVisible}
      onClose={tagEditor.closeTagEditor}
      onSave={(tags) => {
        void tagEditor.saveTagEdits(tags);
      }}
      tags={tagEditor.tags}
      title={tagEditor.title}
    />
  );
};
