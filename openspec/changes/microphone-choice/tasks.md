## 1. Model and storage

- [ ] 1.1 `microphone-choice-model.ts` (parse, pick the device id for a choice and the connected inputs, when to ask, label fallbacks, copy) with specs
- [ ] 1.2 Storage and live store (the rename choice store pattern) with specs

## 2. Using it

- [ ] 2.1 Web inputs (`microphone-inputs.web.ts`, native sibling) and the chooser request store with specs
- [ ] 2.2 `pcm-source.web.ts` opens the chosen input (`ideal` constraint, label probe)
- [ ] 2.3 Prompt (shared remember row) and its host in `App`

## 3. Settings

- [ ] 3.1 Microphone category (list of inputs, keeps a disconnected remembered one) with specs

## 4. Verify

- [ ] 4.1 Browser scenario: two inputs, prompt, remember, Settings change, dismiss, unplugged input
- [ ] 4.2 Maintainer, iPhone with Bluetooth earbuds: pick the phone's microphone, start Pitch detection with a track playing, and say whether playback stays clear compared with the earbuds' microphone
