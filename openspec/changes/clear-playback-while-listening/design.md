## Context

### Environment of the reports

- iPhone 17 Pro, the app added to the home screen (the web app as a standalone app, not a Safari tab). The iOS version and the earbuds' model were not recorded.
- Chrome on a Mac was not reported as affected; the maintainer tests on Chrome (Mac) and the iPhone only.
- Unreproducible in CI: Chromium has no Bluetooth route and no iOS audio session. The browser scenarios check what the page asks for, never what iOS does.

### Symptom

1. A track (or queue) plays through Bluetooth earbuds with a microphone open (pitch detection on, or recording).
2. Playback starts clear, and after about one to two seconds changes, suddenly, to a thin, low-quality sound.
3. The next song in a queue starts clear again and degrades again after the same delay. Pausing and resuming does the same.
4. It happens with no sound made into the microphone.
5. It does not happen with the iPhone's speaker, and not with a track or the piano alone.
6. A screen recording made while it happened sounded normal.

### Tried in the web app (all on the maintainer's iPhone, none avoided it)

| Idea                                                                     | Release                       | Result                                                                 |
| ------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| The browser's own session (`auto`)                                       | before the audio-session work | already degraded                                                       |
| `playback` session while the piano is open                               | piano first-sound fix         | broke the microphone ("No microphone found")                           |
| `play-and-record` while a microphone is open                             | `piano-first-sound-on-launch` | microphone works; degradation still there                              |
| Choose the iPhone's own microphone (`deviceId` as an `ideal` constraint) | `microphone-choice`           | degradation still there; which input really opened was never read back |
| "Sound while listening" = Automatic                                      | `microphone-choice`           | no difference                                                          |
| "Sound while listening" = Playback once the microphone is on             | `microphone-choice`           | no help; whether the microphone kept hearing was not reported          |

## Findings from the exploration (2026-11-15)

### 1. What Safari does when a page captures (WebKit source, `main`, read 2026-11-15)

`Source/WebCore/platform/audio/cocoa/MediaSessionManagerCocoa.mm`, `updateSessionState()`:

- If the page set an audio session type, that becomes the category. Otherwise, with any active audio capture, the category is play-and-record with mode `VideoChat`.
- After that, **any** play-and-record category with the default mode is changed to `VideoChat`. So `navigator.audioSession.type = 'play-and-record'` and `'auto'` end in the same place while capturing.
- `Source/WebCore/Modules/audiosession/DOMAudioSession.cpp` maps the page's type to a category only (`playback` to media playback, `play-and-record` to play-and-record). There is no way to pass a mode or an option.

`Source/WebCore/platform/audio/ios/AudioSessionIOS.mm`, `setCategory()`, for play-and-record:

```objc
options |= AVAudioSessionCategoryOptionAllowBluetooth
         | AVAudioSessionCategoryOptionAllowBluetoothA2DP
         | AVAudioSessionCategoryOptionAllowAirPlay;
// plus AVAudioSessionCategoryOptionDefaultToSpeaker unless the receiver is preferred
```

`AllowBluetooth` is the hands-free (HFP) option. It is always set, with a FIXME only about its deprecated name. Every other category gets no options. `Source/WebCore/platform/mediastream/ios/AVAudioSessionCaptureDeviceManager.mm` turns a chosen `deviceId` into `setPreferredInput:` on the shared session.

What this explains:

- **Why the settings did nothing.** `auto` and `play-and-record` produce the same session (play-and-record, video chat, HFP allowed). `playback` has no input at all. The session type is therefore not the lever; it does not follow that the page has no lever (Findings 4).
- **Why Bluetooth only.** With HFP allowed and an input open, iOS routes a headset through the hands-free profile, which carries input and output together as mono narrowband audio. The speaker has no such profile. A screen recording taps the audio before the route.
- **Not explained by the source:** the one to two clear seconds after each start. The likely reason is that the session or route is re-applied when an element starts and the hands-free link takes that long to come up, with A2DP carrying the sound meanwhile. This is a guess, and it matters: a per-start reset points at the media element's start as the trigger (Findings 4).

A search result describes an open WebKit bug (311451: output degraded and mono after `getUserMedia` on iOS, `echoCancellation: false` not helping, still present in iOS 26.4). The bug tracker was not reachable from the exploration session, so this is unverified; task 2.4 checks it.

### 2. What native apps do

- **AudioKit Cookbook** (`Cookbook/Cookbook/CookbookApp.swift`), the reference app of the most used open-source iOS audio framework, records and plays at once with:

  ```swift
  try AVAudioSession.sharedInstance().setCategory(.playAndRecord,
      options: [.defaultToSpeaker, .mixWithOthers, .allowBluetoothA2DP])
  ```

  A2DP is allowed and HFP is not. A2DP is output only, so the input stays on the phone's microphone (or a wired or USB one) and Bluetooth output stays on the stereo profile. This is the pattern behind "DAWs can play while recording".

- **Developer reports** (Apple forums, a Zenn write-up) agree on the detail that matters: with both Bluetooth options set, the hands-free microphone wins; dropping the HFP option and keeping A2DP gives phone microphone in, earbuds out. Some reports of the output falling back to the speaker involve calling `setPreferredInput` with both options set, which is the combination Safari uses. The proposed session does not need `setPreferredInput` at all.
- **iOS 26** adds `bluetoothHighQualityRecording` (AirPods microphone at high quality). It is for recording from the earbuds, is not available everywhere, and one project reports playback problems with it (livekit/client-sdk-react-native issue 467). Not needed here: the phone's microphone is closer to what pitch detection wants.
- **Latency.** GarageBand users report that Bluetooth output is late enough to matter when monitoring. A2DP output is typically 150 to 300 ms behind. The native session reports its output latency, which a native app can use.

### 3. Libraries that fit this repo (for the native path, now in `native-playback-follow-ups`)

- **`react-native-track-player` 4.1.2** (already the native player): `setupPlayer` and `updateOptions` take `iosCategory`, `iosCategoryMode` and `iosCategoryOptions`, and `IOSCategoryOptions` has `AllowBluetoothA2DP` (`src/interfaces/PlayerOptions.ts`, `src/constants/IOSCategoryOptions.ts`). The app calls `setupPlayer()` with no options today, so the session is the default playback one.
- **`react-native-audio-api`** (Software Mansion, MIT; 1.1.0 on `main`), already named in `native-playback-follow-ups` 1.1(a), 1.7 and 1.12:
  - `AudioManager.setSystemOptions({ ios: { category: 'playAndRecord', mode: 'default', options: ['allowBluetoothA2DP', 'defaultToSpeaker'] } })`; the native layer accepts `allowBluetoothA2DP` and `allowBluetoothHFP` as separate options.
  - `AudioManager.getDevicesInfo()` gives the current and available inputs and outputs (name and port type), and `setInputDevice(id)` selects an input.
  - `AudioRecorder.onAudioReady({ sampleRate, bufferLength }, callback)` delivers PCM buffers; voice processing (`iosVoiceProcessing`) is off by default, which is what pitch detection needs.
  - `disableSessionManagement` hands the session to the app; the native side also exposes output and input latency.
  - It has an Expo config plugin and needs a development build. Its fit with Expo 54 / RN 0.81 is unconfirmed.

### 4. A browser DAW does it (maintainer, 2026-11-15), and how this app differs from one

The maintainer retested Soundtrap in the phone's browser, with no app installed: it plays while recording with no noticeable loss of playback quality. Soundtrap runs on the same WebKit and gets the same session options (Findings 1), so **the fixed options do not by themselves force the thin sound, and a web fix is possible.** The first version of this design concluded the opposite from the source alone; that was wrong to conclude without a device.

Still to pin down about that test, because each changes what it proves (task 1.1): the same Bluetooth earbuds were in use; the sound was stereo and full, not only "fine"; which microphone it recorded from; Safari tab or home-screen app.

Soundtrap's code is not public. What a browser DAW does differently from this app, as far as it can be told from outside, and what this app does today:

|                  | A browser DAW                                              | This app                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playback         | Web Audio (decoded buffers scheduled in an `AudioContext`) | A media element (the track player's web path), on the browser's native output; through an `AudioContext` only once pitch is shifted (`web-pitch-shifter-core.ts`); composites play through Web Audio |
| Audio contexts   | One for playback and capture                               | Several: the microphone's own (`pcm-source.web.ts`), the piano's, the pitch shifter's, the composite engine's                                                                                        |
| Microphone graph | Into the same context that plays                           | A separate context, connected to its destination through a silent gain: a second, always-running output                                                                                              |
| Input device     | A picker inside the studio                                 | `deviceId` as `ideal`; what opened was never read back                                                                                                                                               |
| Session type     | Unknown, probably none                                     | `play-and-record` set by the page                                                                                                                                                                    |

Hypotheses for the difference, in order of fit with the symptom:

1. **The media element is the trigger.** The thin sound starts one to two seconds after each element start and resets on each new song and each resume. A Web Audio transport has no such per-song start. In WebKit a media element plays through a different path (AVPlayer in the GPU process) than Web Audio and capture (one audio unit), and element starts re-run the session update.
2. **Two output contexts while capturing.** The microphone's context holds its own output next to the playback output.
3. **Which input is really open.** With the hands-free option allowed, iOS takes the earbuds' microphone unless another input is preferred; a DAW's picker may end on the phone's microphone where this app's `ideal` request did not.
4. **The page's own `play-and-record` request**, where a DAW leaves the session alone. The earlier `auto` test argues against this but was done with everything else unchanged.

Two checks need no code, in the deployed app, with the earbuds and pitch detection on (task 1.2):

- **Play a composite track.** It plays through Web Audio only. Clear sound there supports hypothesis 1.
- **Shift a track's pitch by a semitone and set it back to 0.** From then on that element plays through an `AudioContext` (the dry path). Clear sound after that also supports hypothesis 1 and points at a small fix.

## Goals / Non-Goals

**Goals**

- In the web app on the maintainer's iPhone with Bluetooth earbuds, a queue plays clear for its whole length while pitch detection listens, and recording over a track stays clear.
- Find the working configuration by listening on the device, with a control (Soundtrap) on the same phone and earbuds, before changing the playback or capture path.

**Non-Goals**

- A native audio path. Native parity comes after the web app is stable (maintainer, 2026-11-15); the native findings (Findings 2 and 3) are recorded in `native-playback-follow-ups` 1.12 and 1.13.
- Recording from the earbuds' microphone at high quality.

## Decisions

### Decision 1: The fix is sought in the web app

Soundtrap shows it can be done there (Findings 4). The native session (play-and-record with A2DP only) stays the known-good fallback and is kept with the native follow-ups, not built here.

### Decision 2: A sound lab in the web app, used on the device, decides the configuration

CI cannot hear a Bluetooth route, and the earlier attempts changed one thing per release and were judged by ear on a music track. The lab is a page in the deployed web app (Settings > Microphone > `Sound lab`, marked experimental) so it can be tried on the phone from GitHub Pages with no build:

- **A test signal that makes the call mode obvious:** a tone that alternates left and right with high-frequency content. In the hands-free mode it is mono and dull; no judgement of "thin" is needed.
- **One switch per difference in Findings 4**, each independent:
  - playback: media element / Web Audio in its own context / Web Audio in the microphone's context;
  - microphone: the system's choice / the phone's microphone by `exact` id, with the label of the input that really opened shown;
  - microphone graph: silent gain to the destination (today) / a media-stream destination / the playback context;
  - session type: none / `play-and-record`;
  - processing constraints: all off (today) / the browser's defaults;
  - order: context first, then the microphone, and the reverse.
- **A readout** of what the page can see: the opened input's label and settings, each context's sample rate and state, `navigator.audioSession.type`, and a level meter to show the microphone still hears.
- **A result line to copy** (the switch states and the readout), so a session's findings can be pasted back into this document.

The lab is the smallest thing that can falsify each hypothesis; it carries no product behavior, and it is removed or kept behind the experimental mark once the fix ships.

### Decision 3: The fix follows the lab, most likely one of these

Written now so the cost is visible; chosen in task 2.1 from what was heard.

- **(a) Element through the playback context while a microphone is open** (if hypothesis 1 holds and the dry-path check is clear). The pitch shifter already builds that graph; the change is to build it when listening starts and not only on the first pitch shift. Small. Cost: `createMediaElementSource` permanently reroutes an element, and the graph adds the context's latency to playback.
- **(b) One shared context** for capture and the app's Web Audio (if hypothesis 2 holds): the microphone taps into the context that already plays, with no second output. Medium; touches `pcm-source.web.ts`, the piano, the pitch shifter and the composite engine's context ownership.
- **(c) The phone's microphone by `exact` id** when earbuds are connected (if hypothesis 3 holds). Small; `microphone-choice` already has the picker.
- **(d) A Web Audio transport for single tracks** (if only pure Web Audio playback is clear and (a) is not). Large: the track player's web path, caching, shaping and lock-screen transport all sit on the media element; the composite engine is the model. This would be its own change.
- **(e) No session type from the page** (if hypothesis 4 holds). Small, but the piano's `playback` request for the silent switch must keep working.

Whatever is chosen, the "Sound while listening" setting is removed: its three options cannot differ in a useful way (Findings 1).

### Decision 4: If nothing in the lab is clear, the app says so

Then Soundtrap's result has a cause not listed here; the lab's readout and the Soundtrap control go into a WebKit bug report, and the web app shows a notice where the microphone is turned on in iPhone and iPad browsers (Bluetooth earbuds sound thin while the app listens; the speaker or wired earphones sound right). The spec keeps this as the fallback requirement.

## Risks / Trade-offs

- **The Soundtrap test may not be the same case** (other headphones, or the hands-free mode being good enough on those earbuds to pass unnoticed). Mitigation: task 1.1 repeats it with the lab's test signal habits (hard-panned material) on the same earbuds before any code.
- **The working configuration may be the large one (d).** Mitigation: the two no-code checks and the lab tell this before anything is built; (d) would be proposed as its own change.
- **Routing the element through a context changes playback for everyone who listens,** including latency against the recording clock. Mitigation: only while a microphone is open, and the recording alignment (clock-anchor fit) is rechecked on the device.
- **Results by ear on one phone and one pair of earbuds.** Mitigation: the copied result line records the iOS version, the opened input and the switch states; a second pair of earbuds is tried if available.

## Open Questions

1. The details of the Soundtrap test (task 1.1): same earbuds, stereo or not, which microphone, tab or home-screen app.
2. The iOS version and the earbuds' model.
3. Whether the lab stays in Settings after the fix (as a support tool for singers' reports) or goes.
