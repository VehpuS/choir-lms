import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';

type AdjustedSaveRenameProps = {
  isSaving: boolean;
  onRename: (name: string) => void;
  savedName: string;
};

// The confirmation's `Rename` link: the save already happened under a smart
// default name, so naming is an after-the-fact edit, not a gate (task 8.56).
export const AdjustedSaveRename = ({
  isSaving,
  onRename,
  savedName,
}: AdjustedSaveRenameProps) => {
  const [draftName, setDraftName] = useState<string | null>(null);

  if (draftName === null) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setDraftName(savedName);
        }}
        style={styles.link}
      >
        <Text style={styles.linkLabel}>Rename</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.editor}>
      <TextInput
        accessibilityLabel="Name"
        autoFocus
        onChangeText={setDraftName}
        onSubmitEditing={() => {
          onRename(draftName);
          setDraftName(null);
        }}
        placeholderTextColor={appTheme.colors.textFaint}
        style={styles.input}
        value={draftName}
      />
      <View style={styles.actions}>
        <OutlinedActionButton
          disabled={isSaving}
          fill
          label="Cancel"
          onPress={() => {
            setDraftName(null);
          }}
        />
        <OutlinedActionButton
          disabled={isSaving || draftName.trim() === ''}
          fill
          label="Save name"
          onPress={() => {
            onRename(draftName);
            setDraftName(null);
          }}
          variant="accent"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  editor: {
    gap: appTheme.space.xs,
  },
  input: {
    ...appTheme.type.body,
    fontSize: appTheme.type.input.fontSize,
    borderColor: appTheme.colors.border,
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    color: appTheme.colors.text,
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.md,
  },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: appTheme.space.touchTarget,
  },
  linkLabel: {
    color: appTheme.colors.accentText,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
