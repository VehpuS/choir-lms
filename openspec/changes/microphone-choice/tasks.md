## 1. Model and storage

- [x] 1.1 `microphone-choice-model.ts` (parse, pick the device id for a choice and the connected inputs, when to ask, label fallbacks, copy) with specs
- [x] 1.2 Storage and live store (the rename choice store pattern) with specs

## 2. Using it

- [x] 2.1 Web inputs (`microphone-inputs.web.ts`, native sibling) and the chooser request store with specs
- [x] 2.2 `pcm-source.web.ts` opens the chosen input (`ideal` constraint, label probe)
- [x] 2.3 Prompt (shared remember row) and its host in `App`

## 3. Settings

- [x] 3.1 Microphone category (list of inputs, keeps a disconnected remembered one) with specs

## 4. Experiment: sound while listening

- [x] 4.0 `AudioRoute` in the arbiter (`holdCapture(route)` returning a hold with `opened()`; four specs), `audio-route-store.ts` (three specs), the Settings control (spec), `pcm-source.web.ts` reads the route and calls `opened()` once the stream runs, scenario `microphone-audio-route` (each route and the type returning)

## 5. Verify

- [x] 5.1 Browser scenario: two inputs, prompt, remember, Settings change, dismiss, unplugged input
- [ ] 5.2 Maintainer, iPhone with Bluetooth earbuds (the prompt works; the thin call sound still starts a second or two after each playback start while the microphone is open): try each "Sound while listening" route, with a track playing and the microphone on, and say which keeps the sound clear, and whether the microphone still hears you under Playback
