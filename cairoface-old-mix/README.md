# Cairo FACE — the "old-mix" build

The variant published at <https://old-mix.cairoface.pages.dev>, a Cloudflare
Pages branch preview alongside the main deployment in [`../cairoface`](../cairoface).
Mirrored on 2026-10-15 and crawled to closure.

## How it differs from the main build

It is a **separate, older build of the whole site**, not a skin applied on top
of the current one. Every page differs:

- `css/edit.css` carries the look, in place of the main build's
  `css/theme.css` + `css/classicbg.css`.
- The header is `data-theme="dark"` and uses `img/logo-cface-blue.png`.
- The homepage leads with a side-profile photograph rather than the push video.
- Asset versions are older (`styles.css?v=372` against the main build's `385`).
- `abstract-submit.html` and `signup.html` do not exist here yet.

## Known broken on the deployment

These are missing from the published build itself — the crawl could not find
them, and requesting them returns the 404 page. They are **not** omissions of
this mirror:

| Missing | Referenced by |
| --- | --- |
| `css/pages.css`, `css/motion.css`, `js/motion.js` | all 15 inner pages |
| `js/icons.js` | 11 inner pages |
| `js/auth.js` | `login.html` |
| `js/registration.js` | `registration.html` |
| `js/doctor-facets.js` | `speakers.html` |
| `img/cf-hero.jpg`, `img/cf-artwork.jpg`, `img/cf-eventplan.jpg`, `img/abstract-board.jpg`, `img/floorplan.jpg`, `img/lead/avatar/samir-ghoraba.jpg` | inner pages |
| `img/event/ev-*.jpg` (ten files) | the `js/main.js` photo deck — also missing on the main deployment |

In practice the **homepage is the only page that renders as intended**; every
inner page loads without its page stylesheet and motion script. Whatever
produced this build did not upload those files.

## Running it locally

```bash
cd cairoface-old-mix
python3 -m http.server 8000
```

## Deploying

Direct upload to the Pages project under the `old-mix` branch alias, which
needs credentials this repository does not hold:

```bash
npx wrangler pages deploy cairoface-old-mix --project-name=<project> --branch=old-mix
```
