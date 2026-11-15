## 0. Findings and exploration (done)

- [x] 0.1 Record the symptom, what was tried and the hypotheses (`design.md`, Context)
- [x] 0.2 Read how Safari sets the iOS audio session while capturing (WebKit source) and how native audio projects keep Bluetooth output clear while recording (`design.md`, Findings 1 to 3)
- [x] 0.3 Propose a solution (`design.md`, Decisions)

## 1. Device probe (decides whether groups 2 and 3 are built)

- [ ] 1.1 Add `react-native-audio-api` to `mobile-rehearsal-player` (manifest and root lockfile together, `npm ci`), its Expo plugin and the iOS microphone usage string in `app.config.ts`; confirm it builds with Expo 54 / RN 0.81 and that `typecheck-config`, `typecheck`, `build` and the web export still pass
- [ ] 1.2 Debug probe screen, development builds only: play a track through the track player, toggle an `AudioRecorder` with a level meter, switch session variants (A2DP only; A2DP and HFP; `measurement` mode), and show the current input, current output and output latency from the session
- [ ] 1.3 In the probe, find which library sets the session without the other undoing it (track player options with `disableSessionManagement`, or the reverse), and whether changing the category during playback is audible
- [ ] 1.4 Maintainer, iPhone with the same Bluetooth earbuds, rebuilt development build: with A2DP only, does a queue stay clear and stereo across songs, pause and resume while the meter moves? Does the A2DP and HFP variant reproduce the thin sound? Record the iOS version, the earbuds' model, the route names shown and the latency
- [ ] 1.5 Web check in the same pass: show the label of the input that really opened in Settings > Microphone; if it was the earbuds' microphone despite choosing the iPhone's, try `deviceId: { exact }` once and listen. Look up WebKit bug 311451 and add this case, or file one, citing the fixed options in `AudioSessionIOS.mm`
- [ ] 1.6 Checkpoint with the maintainer: probe result, and the open questions in `design.md` (is native pitch detection alone worth shipping; distribution). Record the decision here before continuing

## 2. iOS app: pitch detection with a clear Bluetooth route (only after 1.6)

- [ ] 2.1 Spec delta for `pitch-detection` (listening available on iOS native) and move the iOS half of `native-playback-follow-ups` 1.12 here
- [ ] 2.2 Native session owner in `components/audio-session/` with the arbiter's `holdCapture` shape: playback category when nothing captures, play-and-record with A2DP only and `defaultToSpeaker` while a hold is open; exposes the output latency; specs against a fake session
- [ ] 2.3 `pcm-source.ios.ts` through `createSharedPcmSource`: recorder blocks into the existing frame assembler, voice processing off, takes a capture hold while open, maps interruptions and permission errors to the existing `PcmSourceError` kinds; specs with a fake recorder
- [ ] 2.4 `pitchCapabilities().canListen` true on iOS; permission asked on the first `Listen`; capture only while the app is visible
- [ ] 2.5 Microphone choice on iOS native: the phone's microphone or a wired or USB one, no Bluetooth input, with a line saying why
- [ ] 2.6 Device checks: `Minimum volume` range and default against the phone's microphone with earbuds in; sound-to-display delay; a call or Siri during listening; permission denied; lock-screen controls still work while listening; AirPlay output
- [ ] 2.7 Remove the probe screen, or keep it behind the development flag if it earned its place

## 3. Web app: say it, and remove the experiment

- [ ] 3.1 Notice in the microphone prompt and Settings > Microphone on iOS browsers (copy in the shared copy file; prominent when a Bluetooth-labelled input is listed); names the iOS app once group 2 ships
- [ ] 3.2 Remove "Sound while listening": `audio-route-store`, the Settings control, the `AudioRoute` branches of the arbiter and their specs; the arbiter keeps `playback` for the piano and `play-and-record` while capturing
- [ ] 3.3 Browser scenario for the notice (an iOS profile with a Bluetooth-labelled input), replacing `microphone-audio-route`; run it several times
- [ ] 3.4 Update `docs/mobile-cross-platform-audio-playback.md` (the session owner on native, why the web cannot do it) and the README if the development focus changes

## 4. Verify

- [ ] 4.1 Maintainer's iPhone with Bluetooth earbuds, iOS app: a queue with pitch detection on stays clear across songs, pause and resume
- [ ] 4.2 Home-screen web app on the same phone: the notice appears where the microphone is turned on, and pitch detection works as before
