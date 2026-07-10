import { TagEditorSheet } from '../../components/tag-editor-sheet';
import type { useSavedRehearsalLibraryTagEditor } from './use-saved-rehearsal-library-tag-editor';

type SavedRehearsalLibraryTagEditorSheetProps = {
  tagEditor: ReturnType<typeof useSavedRehearsalLibraryTagEditor>;
};

export const SavedRehearsalLibraryTagEditorSheet = ({
  tagEditor,
}: SavedRehearsalLibraryTagEditorSheetProps) => {
  return (
    <TagEditorSheet
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
