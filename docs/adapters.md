# Writing an adapter

An adapter teaches Herald how to read one site. It is a single file under
`extension/adapters/`, plus one entry in `extension/manifest.json`.

## The shape

```js
globalThis.__HeraldAdapter = {
  id: "example",            // stable key, used for settings and Discord app mapping
  name: "Example",          // shown to the user
  activityType: 3,          // 3 = Watching, 2 = Listening
  poll: 1000,               // ms between reads

  getState() {
    // Return null when nothing is playing.
    return {
      title: "",            // required
      subtitle: "",         // episode, artist, channel
      isPlaying: true,
      muted: false,
      currentTime: 0,       // seconds
      duration: 0,          // seconds, 0 if unknown or live
      isLive: false,
      imageUrl: "",         // https, under 256 characters, or ""
      url: location.href
    };
  }
};
```

Register it in `manifest.json`:

```json
{
  "matches": ["*://example.com/*"],
  "js": ["shared.js", "adapters/example.js", "core.js"],
  "run_at": "document_idle"
}
```

Add the site's `matches` to the `main-world.js` content script entry as well, and add the
site to `SITES` in `popup.js` so it gets a toggle.

## Where to get the data, in order of preference

1. **`navigator.mediaSession.metadata`** — cleanest source; survives DOM redesigns.
   It is not readable from a content script, so Herald bridges it from the page's own
   JavaScript context. Read it via `HeraldMS.data` (`{ title, artist, album, artwork,
   playbackState }`, or `null`).

2. **The `<video>` element** — always use this for `currentTime`, `duration` and
   `paused`. `HeraldUtil.video()` returns the playing one.

3. **The site's own state object** — e.g. Netflix exposes episode and artwork data that
   never appears in the DOM. This needs a bridge in `main-world.js`; the result arrives
   as `HeraldSite.data`.

4. **DOM selectors** — last resort, and the first thing to break. Prefer attribute
   selectors (`[data-uia="..."]`) over generated class names, and cache the last non-empty
   value: many players remove overlay text when the controls auto-hide.

## Helpers

`HeraldUtil.video()` — the playing `<video>`, or `null`
`HeraldUtil.text(selector, root?)` — trimmed text content, or `""`
`HeraldUtil.parseTime("1:02:03")` — seconds

## Things worth knowing

- **Artwork URLs must be under 256 characters.** Discord silently drops longer ones.
  Prefer a smaller variant if the site offers several.
- **Sites with no reachable artwork** fall back to a logo asset uploaded to that site's
  Discord application; see `SITE_IMAGES` in `companion/index.js`.
- **Discord rate-limits activity updates.** The companion app throttles for you — do not
  try to compensate in the adapter. Just report the truth every poll.
- **Report `sampledAt` implicitly**: `core.js` stamps it, so a slow round trip does not
  shift the progress bar. Always report the real `currentTime`, never a guess.
- **Live streams**: set `isLive: true`, put the elapsed stream time in `currentTime`, and
  leave `duration` at 0.

## Testing

Load the extension unpacked, open the site, and watch the console: `core.js` logs the
adapter output once per second. Get that object right and the rest follows.
