# Telegram Web A

This project won the first prize 🥇 at [Telegram Lightweight Client Contest](https://contest.com/javascript-web-3) and now is an official Telegram client available to anyone at [web.telegram.org/a](https://web.telegram.org/a).

According to the original contest rules, it has nearly zero dependencies and is fully based on its own [Teact](https://github.com/Ajaxy/teact) framework (which re-implements React paradigm). It also uses a custom version of [GramJS](https://github.com/gram-js/gramjs) as an MTProto implementation.

The project incorporates lots of technologically advanced features, modern Web APIs and techniques: WebSockets, Web Workers and WebAssembly, multi-level caching and PWA, voice recording and media streaming, cryptography and raw binary data operations, optimistic and progressive interfaces, complicated CSS/Canvas/SVG animations, reactive data streams, and so much more.

Feel free to explore, provide feedback and contribute.

## Running it under your own name (this fork)

This is a fork of [Ajaxy/telegram-tt](https://github.com/Ajaxy/telegram-tt),
kept close to upstream so that rebasing stays cheap. Everything that makes it
*yours* — the name, the domain links point at, the host it is served from, the
page metadata — lives in one file, `.env`, and every value there falls back to
Telegram's own when it is empty. A checkout with no `.env` builds and behaves
exactly as upstream does.

Copy `.env.example` to `.env`, put your API ID and hash from
[my.telegram.org](https://my.telegram.org) in it, and fill in the branding
block:

| Variable | What it changes |
|---|---|
| `APP_NAME` | The app's name: the main menu footer, the notification title, the shared worker's name |
| `APP_TITLE` | Document title, installed-app title, manifest title, `og:`/`twitter:` title |
| `APP_DESCRIPTION` | The meta description and the `og:`/`twitter:` description |
| `APP_HOST` | The host this build is served from. Gates the cross-version links to Web K/Z and the permanent-version redirect, so a branded deploy stops pointing users at Telegram's own clients |
| `SHORT_DOMAIN` | The short domain every link the app builds starts with — usernames, invite links, gift links, shared-message links |
| `APP_PROTOCOL` | The scheme a `resolve` deep link uses |
| `THEME_COLOR` / `TILE_COLOR` | The `theme-color` meta tag and the Windows tile colour. Quote the value — an unquoted `#` starts a comment in dotenv |
| `WEBSYNC_ENABLED` | Set to `0` to stop pinging Telegram's `/_websync_` endpoint (see below) |

`SHORT_DOMAIN` is the load-bearing one: `TME_LINK_PREFIX` in `src/config.ts` is
the single place every username and share link is assembled, and the matching
`RE_TME_LINK` / `RE_TG_LINK` patterns and `TME_WEB_DOMAINS` set follow it. Set
it once and the whole client links to your domain.

Two things stay Telegram's on purpose, because they are Telegram's
infrastructure rather than branding:

- **MTProto endpoints.** The client opens its transports straight to
  `zws1..5.web.telegram.org` (`src/lib/gramjs/Utils.ts`). A branded deploy is
  not a proxy for them.
- **The `/_websync_` ping.** On first load per day, the client injects a
  `<script>` at `t.me/_websync_`, which tells Telegram's edge that a web session
  is live and lets it redirect between Web A and Web K. A branded host does not
  serve that endpoint, so the ping switches itself off once `SHORT_DOMAIN` is
  set (and the CSP drops the matching `script-src` entries). Force it either way
  with `WEBSYNC_ENABLED`.

### What is *not* configurable yet

The visible "Telegram" in the interface comes from the **language pack**, not
from `APP_NAME`. `src/assets/localization/fallback.strings` holds the English
fallback, but `util/localization` fetches the pack from Telegram's servers and
caches it in IndexedDB, so a packaged string is replaced on the first sync.
Rebranding those needs a local override map applied after the pack loads — the
`tweb` fork solves the same problem against its own `lang.ts`. Until that lands,
`APP_NAME` reaches the menu footer and the notification title, and nothing else.

The icons in `public/` (favicons, PWA icons, `site*.webmanifest`) and the
accent colour in `src/styles/_variables.scss` are still Telegram's. Swapping
them is an asset replacement, not a code change.

### Deploying

`.docker/Dockerfile_production` builds the bundle and serves it from nginx:

```sh
docker compose up -d --build
```

The branding is compiled in — Vite inlines `import.meta.env.*`, so `.env` is read
by the builder and never shipped. **Editing `.env` requires a rebuild**; pulling
a new image only swaps whatever a previous build baked in.

## Local setup

```sh
cp .env.example .env

npm i
```

Obtain API ID and API hash on [my.telegram.org](https://my.telegram.org) and populate the `.env` file.

## Dev mode

```sh
npm run dev
```

### Invoking API from console

Start your dev server and locate GramJS worker in the console context.

All constructors and functions available in global `GramJs` variable.

Run `npm run gramjs:tl full` to get access to all available Telegram methods.

Example usage:
``` javascript
await invoke(new GramJs.help.GetAppConfig())
```

### Dependencies
* [GramJS](https://github.com/gram-js/gramjs) ([MIT License](https://github.com/gram-js/gramjs/blob/master/LICENSE))
* [fflate](https://github.com/101arrowz/fflate) ([MIT License](https://github.com/101arrowz/fflate/blob/master/LICENSE))
* [cryptography](https://github.com/spalt08/cryptography) ([Apache License 2.0](https://github.com/spalt08/cryptography/blob/master/LICENSE))
* [emoji-data](https://github.com/iamcal/emoji-data) ([MIT License](https://github.com/iamcal/emoji-data/blob/master/LICENSE))
* [twemoji-parser](https://github.com/jdecked/twemoji-parser) ([MIT License](https://github.com/jdecked/twemoji-parser/blob/master/LICENSE.md))
* [tlottie](https://github.com/dkaraush/tlottie) ([MIT License](https://github.com/dkaraush/tlottie/))
* [opus-recorder](https://github.com/chris-rudmin/opus-recorder) ([Various Licenses](https://github.com/chris-rudmin/opus-recorder/blob/master/LICENSE.md))
* [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) ([MIT License](https://github.com/kozakdenys/qr-code-styling/blob/master/LICENSE))
* [music-metadata](https://github.com/Borewit/music-metadata) ([MIT License](https://github.com/Borewit/music-metadata/blob/master/LICENSE.txt))
* [Tiptap](https://github.com/ueberdosis/tiptap) ([MIT License](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md))
* [marked](https://github.com/markedjs/marked) ([MIT License](https://github.com/markedjs/marked/blob/master/LICENSE.md))
* [lowlight](https://github.com/wooorm/lowlight) ([MIT License](https://github.com/wooorm/lowlight/blob/main/license))
* [idb-keyval](https://github.com/jakearchibald/idb-keyval) ([Apache License 2.0](https://github.com/jakearchibald/idb-keyval/blob/main/LICENCE))
* [fasttextweb](https://github.com/karmdesai/fastTextWeb)
* fastblur

## Bug reports and Suggestions
If you find an issue with this app, let Telegram know using the [Suggestions Platform](https://bugs.telegram.org/c/4002).
