# The manual's videos

A video is a script: `scripts/<video>.yml`. One command records it from the DEV tenants (English on
`DOCS_EN_URL`, Portuguese on `DOCS_PT_URL`), adds the narration and assembles it, so a change in the
product is only a new run:

```
npm ci                          # once, in this folder
npm run videos -- 01-overview   # both languages
npm run videos -- 01-overview --lang pt
```

Out come `out/01-overview-en.mp4` and `out/01-overview-pt.mp4` (1920×1080, 30 fps), each with its
subtitles (`.srt`). `out/` stays out of git, and so does the work folder inside it (frames, cards,
provisional voice, segments).

## Where it runs

In Docker, like the captures: Playwright's image plus ffmpeg and espeak-ng (`Dockerfile`), built by
`run.js` the first time (`snappingtrail-docs-videos:1.64.1`). The host installs nothing. The same
rules as the captures hold: the credentials come from `~/.config/snappingtrail/docs-captures.env`,
mounted read-only and masked in everything printed; the session is the captures' own; any request to
the API other than a read fails the scene; share links are masked and QR codes blurred.

## The script

```yaml
id: 01-overview
title: {en: What Snapping Trail is, pt: O que é o Snapping Trail}
scenes:
  - id: 03-fitplus            # also the name of the scene's narration file
    minDuration: 12           # seconds; the scene lasts the longer of this and its narration
    narration: {en: "…", pt: "…"}
    screen:
      app:
        path: /projects       # in the language's tenant; signedIn: false for the public pages
        setup: [...]          # steps off camera, at full speed
        mask: [shareLinks, qrCode, fields]
        insightsMode: true    # the app's insights mode, as the captures set it
        css: "…"              # extra CSS while recording
      actions: [...]          # steps on camera, smooth, with the cursor
```

A screen is one of:

- `app`: a screen of the app, with `setup` and `actions`.
- `images`: images one after the other with a cross-fade (the Collect app's captures);
  `{docs}` is the language's docs folder and `{lang}` the language.
- `card`: `opening` (logo and title), `closing` (logo, the manual's address and its line) or
  `slack` (FitPlus's findings as the Slack message shows them, from `assets/slack-findings.yml`).

A scene can also have `parts`, each a screen with its `share` of the scene's time (scene 10: the
Reports tab, then the Slack message).

Steps: `wait: 2`, `goto: /path`, `waitFor: target`, `click: target`, `glide: target` (moves the
cursor), `scroll: {by: 1200, duration: 6}`, `scrollTo: target`, `highlight: target` (a ring around
it), `zoom: target` (with `scale`). A target is found by `role` (with `text` as its name), `testid`,
`css` or `text`, inside `within`, filtered by `hasText`; `exact`, `nth`, `visible`, `parent` (its
parent element) and `card` (the insight card around it) refine it, and `duration` sets the time of
the movement. Texts are either one string or `{en, pt}`.

## The narration: from the provisional voice to ElevenLabs

Each scene's narration is one file per language. Until the final voice exists, espeak-ng reads the
script's text — a robotic voice, there only to set the timing. To use ElevenLabs:

1. Generate each scene's narration from the script's text, in each language.
2. Save it as `voice/<video>/<lang>/<scene id>.mp3` (`.wav` and `.m4a` also work), for example
   `voice/01-overview/pt/07-insights.mp3`.
3. Run `npm run videos -- 01-overview` again.

A scene with its file in `voice/` uses it; a scene without one keeps the provisional voice, and the
run says how many still do. The scene's length follows the new narration (0.4 s before it, 0.8 s
after it, never less than `minDuration`), and so do the subtitles, which always come from the
script's text: change the text in the script and in the audio together.
