## Environment of the reports

- iPhone 17 Pro, the app added to the home screen (the web app as a standalone app, not a Safari tab). The iOS version and the earbuds' model were not recorded.
- Chrome on a Mac was not affected by this (not reported); the maintainer tests on Chrome (Mac) and the iPhone only.
- Unreproducible in CI: Chromium has no Bluetooth route and no iOS audio session. The browser scenarios use stand-ins that check what the page asks for, never what iOS does.

## Symptom, precisely

1. A track (or queue) is playing through Bluetooth earbuds with a microphone open (pitch detection on, or recording).
2. Playback starts clear.
3. After about one to two seconds it changes, suddenly, to a thin, low-quality sound, "as if from a cheap speaker".
4. The next song in a queue starts clear again and degrades again after the same delay. Pausing and resuming does the same.
5. It happens with no sound made into the microphone.
6. It does not happen with the iPhone's speaker, and not with a track or the piano alone, only when a microphone is involved.
7. A screen recording made while it happened sounded normal.

The reset on each playback start, with a delay, suggests the route is re-negotiated whenever output starts while an input is open, not that something drifts or accumulates in the page.

## Tried (all on the maintainer's iPhone, none avoided it)

| Idea                                                                                                                       | Release                       | Result                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Do nothing special: the browser's own session (`auto`)                                                                     | before the audio-session work | already degraded ("playback issues while the mic is up", noticed before any change here)          |
| Ask for the `playback` session while the piano is open                                                                     | piano first-sound fix         | broke the microphone: pitch detection said "No microphone found" (`playback` has no input on iOS) |
| Ask for `play-and-record` while a microphone is open, `playback` only for the piano with nothing capturing                 | `piano-first-sound-on-launch` | microphone works again; degradation still there                                                   |
| Choose the iPhone's own microphone (`deviceId` as an `ideal` constraint; prompt and Settings page)                         | `microphone-choice`           | prompt works; degradation still there with the iPhone microphone chosen                           |
| Setting "Sound while listening" = Automatic (the page asks for no session type)                                            | `microphone-choice`           | "neither option seems to do much"                                                                 |
| Setting "Sound while listening" = Playback once the microphone is on (`play-and-record` to start, `playback` once running) | `microphone-choice`           | no help; whether the microphone kept hearing was not reported                                     |

What the page can do is therefore exhausted at these levers: the Audio Session API's `type` (`auto`, `playback`, `play-and-record`, and the transient and ambient types, which do not fit) and the choice of input device. The page cannot set iOS's Bluetooth routing options.

## Hypotheses, in order of fit

1. **Bluetooth profile switch (best fit).** A Bluetooth headset runs one audio profile at a time. While a microphone is capturing, iOS puts the route on the hands-free profile (mono, narrowband, a low-bitrate codec) and leaves the stereo profile (A2DP). Re-negotiating when output restarts would explain the delay after each start and the reset on each new song. It would also explain why a screen recording does not hear it (the recording is made before the route) and why the iPhone speaker is clean. Choosing the iPhone's own microphone may not help because the page cannot ask for the "output Bluetooth A2DP, input built-in" combination: that needs session options the web does not expose.
2. **WebKit puts the session in a capture mode regardless of the page's request.** A WebKit bug comment says that grabbing the microphone sets the session to `play-and-record` automatically, and another report says the session can stay there after the microphone closes. If so, the page's `type` has little say while capturing, which fits "neither option does much".
3. **The microphone's own audio context holds an output.** The web source connects its capture graph, through a gain of zero, to the context's destination (so the graph is pulled). That is a second always-running output context. It is not the cause of the profile switch (the effect also needs an input), but it may add to it. Untested; changing the capture graph blind could break capture on iOS, so it needs a device-side experiment.
4. **Not Bluetooth only.** A WebKit report describes degraded output after `getUserMedia` on an iPhone 8 without Bluetooth. Possibly an iOS version factor.

## What is not known

- The iOS version and the earbuds' model (and whether it is the same with AirPods, other earbuds, or a car).
- Whether it happens in a Safari tab as well as the home-screen app.
- Whether the same happens in a native app on the same phone and earbuds: Voice Memos with music playing, or a DAW (GarageBand, AUM, BandLab) recording over a backing track with the phone's microphone and Bluetooth output. That tells whether the platform allows "built-in microphone in, Bluetooth stereo out" at all, and which session options do it.
- Whether pitch detection alone, recording alone, and both differ.
- Whether the microphone kept working under the `playback` route.
- Whether the effect shows without any playback in the app (the system's own audio playing, with the page only capturing).

## Directions for the exploration (not decisions)

These come from general knowledge of iOS audio, not from anything verified here.

1. **Native audio session with explicit options.** A native app configures `AVAudioSession` in the play-and-record category with the option to allow Bluetooth A2DP output (and to prefer the built-in microphone as the input), which is the usual way a recording app keeps stereo Bluetooth output while using the phone's microphone. The web cannot set these options; a native path (Expo native module or a native audio engine) can. The repo's native side uses `react-native-track-player` for playback and has no microphone capture (`native-playback-follow-ups`), so this is a sizable piece of work.
2. **Learn from DAWs.** How GarageBand, BandLab, AUM, Loopy and similar apps choose input and output separately, what they do on Bluetooth (many warn about it, or disable the Bluetooth microphone), and how they compensate the latency of Bluetooth output when aligning a recording to a track. The app already has a clock-anchor fit and click calibration for recordings, which would need to cover a long Bluetooth output latency too.
3. **Mitigate in the web app.** Detect a Bluetooth route where the browser allows it, and tell the person (the speaker or wired headphones sound better while the microphone is on); offer a "listen without microphone" practice mode (play with pitch detection off, then analyse), and recording where the track is heard in the speaker. Cheap, honest, and does not fix the sound.
4. **Test the capture graph.** Remove the microphone context's output connection (a media-stream destination as the sink) in an experiment with a device-side check, to see whether the extra output matters.

## Risks

- A web-only fix may not exist. The exploration should say so early, from a native-app baseline on the same phone and earbuds (see "What is not known"), before building anything.
- A native path changes the app's footprint (microphone capture natively, session handling, the recording engine's clock) and should be its own change.
