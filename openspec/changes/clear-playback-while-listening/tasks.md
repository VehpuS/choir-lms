## 0. Findings and exploration (done)

- [x] 0.1 Record the symptom, what was tried and the hypotheses (`design.md`, Context)
- [x] 0.2 Read how Safari sets the iOS audio session while capturing (WebKit source) and how native audio projects keep Bluetooth output clear while recording (`design.md`, Findings 1 to 3); native findings copied to `native-playback-follow-ups` 1.12 and 1.13
- [x] 0.3 Record the browser DAW result and how this app differs from one (`design.md`, Findings 4)

## 1. On the device, no code

- [ ] 1.1 Maintainer: pin down the Soundtrap test with the same Bluetooth earbuds: is playback stereo and full while recording (use a hard-panned or wide track), which microphone does it record from (tap the phone, then an earbud), Safari tab or home-screen app; also the iOS version and the earbuds' model
- [ ] 1.2 Maintainer, deployed web app, earbuds, pitch detection on: (a) play a composite track; (b) play a track, shift its pitch by one semitone, set it back to 0, and keep listening across the next pause and resume. Note which stay clear
- [ ] 1.3 Record both results in `design.md` (Findings 4) and reorder the hypotheses

## 2. Sound lab (web)

- [ ] 2.1 Sound lab screen under Settings > Microphone, marked experimental: the left and right test signal, the switches of design Decision 2 (playback path, microphone, microphone graph, session type, processing constraints, order), the readout and the result line to copy; pure model with specs, and a browser scenario for the controls and the readout
- [ ] 2.2 Maintainer, on the phone with the earbuds: find the switch states that stay stereo and clear with the level meter moving; paste the result lines here
- [ ] 2.3 Checkpoint: choose the fix from design Decision 3 with the maintainer, update `design.md` and the tasks of group 3 to the chosen one; if it is the Web Audio transport for single tracks, stop and propose that as its own change
- [ ] 2.4 Look up WebKit bug 311451; if the lab shows a trigger (for example a media element start while capturing), add it there or file a new bug with the result lines

## 3. The fix (written out after 2.3)

- [ ] 3.1 Implement the chosen configuration in the app's capture and playback path, only while a microphone is open, with specs for the model and a browser scenario for what the page builds
- [ ] 3.2 Remove "Sound while listening": `audio-route-store`, the Settings control, the `AudioRoute` branches of the arbiter, their specs and the `microphone-audio-route` scenario; the arbiter keeps `playback` for the piano and `play-and-record` while capturing unless 2.3 decided otherwise
- [ ] 3.3 If nothing in the lab was clear: the notice where the microphone is turned on in iPhone and iPad browsers, with a browser scenario (design Decision 4)
- [ ] 3.4 Decide whether the lab stays (experimental) or is removed; update `docs/mobile-cross-platform-audio-playback.md` with the capture and playback arrangement and why

## 4. Verify

- [ ] 4.1 Maintainer's iPhone with Bluetooth earbuds, home-screen web app: a queue with pitch detection on stays clear across songs, pause and resume; the piano is still audible with the silent switch on; pitch detection still hears
- [ ] 4.2 Same setup: recording over a playing track stays clear and the take is aligned to the track
- [ ] 4.3 Chrome on a Mac: playback, pitch detection and recording unchanged
