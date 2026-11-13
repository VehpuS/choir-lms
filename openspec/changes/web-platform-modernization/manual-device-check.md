# Manual device check

What the automated suite cannot see: a real Chrome on a Mac, and the home-screen web app on an iPhone (iOS Safari engine). Tick what you tried and write what happened next to anything that surprised you; the left-over unknowns are follow-up F.3 in `tasks.md`.

The iPhone and a normal Chrome tab should use the deployed Pages site. For Chrome on a Mac you can also run the built export locally (`npm exec -- nx run mobile-rehearsal-player:build`, then serve `packages/mobile-rehearsal-player/dist`); the dev server (`nx run mobile-rehearsal-player:web`) deliberately has no Content-Security-Policy, so a policy check needs the built site.

## iPhone (home-screen web app)

1. **Install.** Safari, Share, Add to Home Screen. The icon is the waveform with notes on a dark tile (not a screenshot of the page), the name is "Choir LMS", and it opens full screen with a dark status bar.
2. **Sign in with Google** from the account menu. It completes and returns to the app (the policy must not block it); note whether the sign-in window opens inside the app or in Safari.
3. **Keep a track offline** (track menu, Keep offline). The row shows "Kept offline"; the Offline files screen lists it with a size. Close the app completely, switch to airplane mode, reopen, play it. If the app says "This browser may clear offline files when it is short on space." on the Offline files screen, Safari refused persistent storage (expected in a tab, worth knowing in the home-screen app). _(F.3: the automated WebKit run cannot store files.)_
4. **A composite track:** open a composite, let its stems prepare, play, mute and solo a stem. _(F.3)_
5. **The 10-minute track** (if you have a long file): play it, seek to near the end, it carries on. _(F.3)_
6. **Piano:** Practice tools, Piano; hold a key; you hear it, and again while a track plays. _(F.3)_
7. **Back with a sheet open.** Open a track menu or the playback view, then use the edge swipe back. It closes the sheet and stays in the app. With nothing open, note what the swipe does.
8. **Lock screen.** Play a track, lock the phone. The lock screen shows the title and the app icon; play, pause, next and previous work from it and from headphones. Set Auto-Lock to 30 seconds and check the screen stays on while playing, and while a score or lyrics are open, even paused.
9. **Reduce Motion** (Settings, Accessibility, Motion). Sheets appear without sliding. A long track title in the mini-player stays still, cut off with an ellipsis, instead of scrolling.
10. **Rotate** to landscape and back: no gap at the top of the page after closing the playback view.

## Chrome on the Mac

1. **Installable.** DevTools, Application, Manifest: no errors or warnings, an id, the three icons (one maskable), "Installable". Install it (address bar icon or the menu) and it opens in its own window.
2. **No policy violations** on the built site: DevTools Console while you use it (play, loops, sheet music, lyrics, sign in) shows no "Refused to ..." lines. _(On the dev server none are expected either: it has no policy.)_
3. **Back button** with a sheet or menu open closes it instead of leaving the page; Escape closes only the top one.
4. **Media controls.** Play a track, then open Chrome's media control (the icon next to the profile) or use the keyboard media keys: title and the app icon show, play, pause and next work.
5. **Keep offline**, as on the phone. Chrome may show the persistent-storage notice or grant it silently.
6. **Reduce Motion** (macOS Accessibility, Display, Reduce motion, or DevTools, Rendering, Emulate prefers-reduced-motion): sheets without a transition; the long title static.
7. **Keyboard:** Tab stays inside an open sheet, and focus returns to the control that opened it when it closes.
