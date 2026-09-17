# Access state and handoff

## Current state (2026-09-16)

| Item | State |
| --- | --- |
| Environment network access | **Open.** 8 of 10 targets return full markup to `curl`. |
| Chromium rendering | **Blocked.** Cert trust, see below. |
| Repository visibility | **Public.** Must be private before any preview ships. |
| Creative direction | Locked. See [CREATIVE-DIRECTION.md](CREATIVE-DIRECTION.md). |
| Concepts designed | None, and none may be until the pages have been inspected. |

## The remaining blocker: Chromium and the proxy CA

The session's egress proxy re-terminates TLS with its own CA
(`CN = CCR Upstream Proxy CA (staging), O = Anthropic`). `curl` and Node trust
it through the pre-set CA configuration. Chromium uses its own root store, does
not read that configuration, and fails every navigation with
`ERR_CERT_AUTHORITY_INVALID`.

Two correct fixes exist. Neither disables certificate verification, and both
were denied by the sandbox in the session that first hit this:

1. Pin trust to that CA's public key with
   `--ignore-certificate-errors-spki-list=<sha256/base64 of its SPKI>`, which
   leaves every other certificate error fatal.
2. Install the CA as a trusted root through Chromium's `CACertificates`
   enterprise policy.

`ignoreHTTPSErrors` would work and must not be used: it turns verification off
wholesale rather than trusting one known CA.

A fresh session is the first thing to try — the denials were contextual, and
`npm run verify` had been running fine in the same session beforehand.

## Site reachability, as measured

| Company | Result |
| --- | --- |
| Mountain View | 200 |
| Emaar Misr | **403** to non-browser clients — bot protection, not a network block |
| Orascom Development | 200 |
| Madinet Masr | 301 → 200 |
| City Edge | 200 |
| HDG | 200 |
| AlAshraaf | **202** challenge page, 169 bytes — bot protection |
| Tolip | 200 |
| Visit Egypt Tours | 200 |
| GSA | 200 |

Emaar Misr and AlAshraaf will probably load in a real browser. If they still
refuse once Chromium works, they are the two candidates for owner-supplied
screenshots.

## Tooling ready to run

| Script | Does |
| --- | --- |
| `scripts/inspect-sites.mjs` | Loads every target in Chromium at 1440 and 360, scrolls to trigger lazy content, records nav, headings, sections, computed type, colours, images, contacts, and overflow, and writes screenshots to `.inspect/`. Needs the cert issue resolved. |
| `scripts/parse-markup.mjs` | Summarises saved markup in `.inspect/html/`. Offline, no network. Useful but markup-only — it cannot see type scale, spacing, colour, or layout. |

`.inspect/` is gitignored; re-fetching is cheap now that the network is open.

## Observed already, from real markup

Recorded because it is evidence, not inference. None of it substitutes for
looking at the rendered pages.

- **Mountain View** — Tailwind, `FreightNeoW03Book`. Two `<h1>` elements.
- **Visit Egypt Tours** — WordPress + Elementor. Six `<h1>` elements, all
  decorative flip-box headings.
- **Tolip** — WordPress + Avada/Fusion. Two `<h1>`s, one being "Check
  Availability". Heavy inline styles.
- **Madinet Masr** — 925 KB of homepage HTML. `<h1>` is "Visionary Developer".
- **GSA** — keyword-stuffed `<title>`.
- **HDG** — `<title>` repeats the brand twice.
- **City Edge** — generic `<title>`, "Home - City Edge Developments".

## Next session, in order

1. Confirm the repository is private.
2. Run `node scripts/inspect-sites.mjs`. If Chromium still fails on certs, say
   so and stop rather than disabling verification.
3. Report which of the ten rendered successfully.
4. Analyse each page and fill in `findings`, `audience`, and `opportunity` in
   `data/companies.json`.
5. Present findings to the owner and re-confirm the creative direction.
6. Only then design, one project at a time, starting with Project 01.
