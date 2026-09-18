# Cairo FACE World Summit 2027 — site

The static site published at <https://cairoface.pages.dev>, recovered into this
repository so it can be edited and redeployed.

## Where this came from

The original working copy was never committed anywhere — it is not in this
repository's history, nor in any other repository this session can reach. What
is here was mirrored from the live deployment on 2026-09-18: every HTML page,
stylesheet, script and image the site actually serves, fetched over HTTP and
crawled to closure (each file's references followed until nothing new turned
up). It is byte-identical to what the live site serves, so it is a faithful
starting point — but it is a snapshot of the *output*, not the original
authoring history.

The crawl turned up two paths that are not site files and so are not here:
`hqdefault.jpg` (a YouTube thumbnail URL `js/main.js` assembles at runtime) and
`img/x.jpg` (an example inside a comment in `css/motion.css`).

## Layout

```
index.html              the long homepage (78 KB)
about.html              about the summit
agenda.html             programme; data lives in js/agenda-data.js
speakers.html           faculty grid
doctor.html             per-speaker detail, driven by ?id= and js/doctors.js
abstract.html           abstract call
abstract-submit.html    abstract submission form
registration.html       fees and tiers
register.html           registration form
signup.html login.html  account pages, backed by js/auth.js
exhibition.html         sponsors, partners, floor plan
contact.html            contact details

css/styles.css          the bulk of the design system (157 KB)
css/pages.css           per-page styling (65 KB)
css/motion.css          animation and transition layer

js/main.js              homepage behaviour (63 KB)
js/face.js              the animated face visual (50 KB)
js/doctors.js           speaker records + rendering (38 KB)
js/agenda-data.js       the programme as data (19 KB)
js/motion.js            scroll and reveal engine
js/page.js              shared per-page setup
js/icons.js             inline icon set
js/person-modal.js      speaker modal
js/film3d.js            3-D film strip effect
js/gallery.js           gallery
js/railnav.js           rail navigation
js/contactdock.js       floating contact dock
js/pageout.js           page exit transition
js/auth.js              login/signup form handling
js/registration.js      registration form handling
js/abstract-submit.js   abstract form handling

img/                    photography and artwork
img/lead/               10 leadership committee portraits
img/logos/              61 sponsor, partner and endorsement logos
```

## What is loaded from elsewhere

Editing those files here will not change these — they are not part of the
deployment:

- **Roughly 110 images live on S3**, not on Pages, under
  `https://cairoface.s3.eu-central-1.amazonaws.com/` — 89 under `Speakers/`
  (the faculty portraits in `js/doctors.js`) and 23 under `Home/`. They are
  referenced by absolute URL, so they keep working, but replacing one means
  access to that bucket.
- **Graphik** is served by `fonts.cdnfonts.com`.
- **three.js 0.160.0** is imported from `unpkg.com` by `js/film3d.js`.
- Embedded video comes from `youtube-nocookie.com` and `player.vimeo.com`.

## Running it locally

No build step and no dependencies — it is plain HTML, CSS and JavaScript.

```bash
cd cairoface
python3 -m http.server 8000
# then open http://localhost:8000
```

Use a server rather than opening `index.html` from disk: several pages fetch
their own data with `fetch()`, which `file://` blocks.

Links between pages are written as `about.html`, `agenda.html` and so on.
Cloudflare Pages redirects those to extension-less URLs (`/about`) on the live
site; keeping the `.html` suffixes is what makes the same files work locally.

## Deploying

The live site is a Cloudflare Pages **direct-upload** project — there is no Git
integration, so pushing this branch does not publish anything. Publishing takes
a credentialed upload of the whole directory:

```bash
npx wrangler pages deploy cairoface --project-name=<the Pages project name>
```

Two things are needed before that will work, and neither is in this repository:

- `CLOUDFLARE_API_TOKEN` with the **Cloudflare Pages: Edit** permission, and
  `CLOUDFLARE_ACCOUNT_ID`. Set them as environment secrets — never commit them.
- The exact Pages project name behind `cairoface.pages.dev` (probably
  `cairoface`, but confirm it in the Cloudflare dashboard before deploying).

A direct upload replaces the entire site, so deploy the whole `cairoface/`
directory. Uploading a partial copy would delete whatever it omits.
