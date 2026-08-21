import { useState } from 'react';

export const useSavedRehearsalLibraryTagDetailState = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return {
    closeTagDetail() {
      setSelectedTag(null);
    },
    isTagDetailVisible: selectedTag !== null,
    openTagDetail(tag: string) {
      setSelectedTag(tag);
    },
    selectedTag,
  };
};
