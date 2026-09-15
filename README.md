# Angry Study Helper

A local-first Chrome Manifest V3 extension that turns distracting new tabs into a short, humorous study intervention. It contains no analytics, ads, remote scripts, or network requests.

## Install

```sh
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select `dist/chrome/`.

## Usage

Open the toolbar popup and turn on Study Mode. A blank new tab is redirected immediately to the local intervention page. A tab opened with a known URL is checked when Chrome reports its URL; whitelisted domains bypass the redirect. Use Settings to choose Mild, Angry, or Nuclear messages, audio, volume, first-tab/grace behavior, and whitelisted domains.

The extension deliberately does not claim to inspect a destination before Chrome exposes it. If the browser first reports a blank tab, intervention happens at that point; for URL-bearing tabs, `tabs.onUpdated` is observed. This avoids broad website permissions and minimizes visible flicker.

## Audio

Place optional local `angry1.mp3`, `angry2.mp3`, and `angry3.mp3` files in `src/audio/`, then run `npm run build`. Autoplay is attempted; if Chrome blocks it, **Enable angry audio** appears. Missing audio files are safe and do not break the page.

## Privacy and permissions

Everything is stored locally using `storage`. `tabs` is used only to observe new-tab creation/URL updates and redirect the current tab to the extension page. No host permissions or external requests are needed.

## Architecture

`src/` is canonical. `scripts/build.js` copies it into `dist/chrome/` and excludes documentation. `browser/browser-api.js` is the only runtime namespace adapter, using `browser` when available and falling back to `chrome`; storage, tabs, runtime URLs, listeners, and messaging are otherwise kept behind small modules.

The service worker maintains per-tab handled state and only redirects once per tab. It ignores browser-internal schemes and extension URLs, and removes state when a tab closes, preventing redirect loops. Returning from the intervention page does not itself count as another distraction because the intervention tab is marked handled.

Whitelist entries are normalized to hostnames, remove a leading `www.`, and match only the exact hostname or a dot-delimited subdomain (`wikipedia.org` matches `docs.wikipedia.org`, not `notwikipedia.org`).

## Safari preparation

The source is intentionally plain WebExtension HTML/JS and uses portable APIs. Later, use Safari’s Web Extension converter in Xcode against the built WebExtension directory, then review the generated app extension and permissions. Expected review points are manifest key support, service-worker lifecycle, tab event details, runtime namespace differences, local audio autoplay, and storage/permission prompts. No fake Safari target is included and Chrome is the currently supported browser.

## Development and tests

Run `npm test` for pure-function checks and `npm run clean` to remove `dist/`. Manual checklist: install; verify Study Mode defaults off; normal tabs work off; enable mode; open a new tab; verify the counter; reload intervention without an extra count; disable mode; persist settings/restart; test whitelist and internal pages; toggle audio and volume; verify lifetime count; test offline.
