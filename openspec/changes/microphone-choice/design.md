## Decisions

1. **One choice, `null` means ask.** Stored per device as `{ deviceId, label }`, or the string `automatic`, or absent (ask each time when more than one input exists). Same storage and store shape as the remembered rename choice (`track-rename-choice-store`), so Settings and the prompt share one live copy.
2. **The prompt is decided before the stream opens.** `openMicrophone` asks an `inputChooser` for a device id. The chooser (pure model plus a small request store) returns the remembered input if it is connected, `undefined` (the system's choice) for `automatic` or a single input, and otherwise shows the prompt and waits. A host component in `App` renders the prompt from the request store, so the platform file never imports UI.
3. **Dismissing is not a failure.** Closing the prompt resolves to the system's choice once. It adds no failure state to the pitch store or the recorder.
4. **Names need an opened microphone.** Safari lists one placeholder input with no id and no name until a microphone has been opened in the page, so the count means nothing before that (found on the iPhone: the first release never prompted, because the placeholder was filtered out and counted as no choice). With nothing remembered, the source opens the system's input, reads the real list, closes it, then asks. A remembered input is asked for by its stored id without that open. The audio session is held for the whole flow. Settings says why the list is short when names are hidden.
5. **An unplugged remembered input is not an error.** The constraint is `deviceId: { ideal }`, so the browser falls back to its default, and the stored choice is kept for when the input returns.
6. **Shared UI.** The "Remember my choice" row is extracted from the bulk-selection prompt and reused; the prompt card is `CenteredDialogCard`.
7. **Platform split.** `microphone-inputs.web.ts` (enumerate, devicechange) with a native sibling that reports none.

## Risks

- Whether choosing the built-in microphone keeps Bluetooth earbuds in stereo output is unverified (task 4.2).
- Input names in Safari can be generic ("iPhone Microphone", the headset's name); the prompt shows them as the browser reports.
