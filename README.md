# Website redesign outreach

A productized redesign offer run as a pipeline: analyse a company's current
landing page, design a premium replacement for it, publish it as an interactive
preview, and send one personalized email. If the company likes the direction,
they pay **EGP 5,000** for the production-ready frontend code of that page.

**Landing page only.** One page per company — the homepage. Not the site.

## What the EGP 5,000 covers

The responsive frontend implementation of the approved concept — markup,
styles, and client-side behaviour, production-ready. It does **not** include
backend or API work, CMS integration, hosting, domains, third-party
integrations, content production, SEO, or ongoing maintenance. Those are quoted
separately, and no page or email may imply otherwise.

## Creative direction

[docs/CREATIVE-DIRECTION.md](docs/CREATIVE-DIRECTION.md) is the approved,
binding brief: Apple-inspired premium minimal, mode chosen per company, bold
oversized headlines, premium/smooth motion, balanced performance, and the
company's own imagery only. Read it before building any page.

## Layout

```
data/companies.json        single source of truth for all 100 companies
outreach/TEMPLATE.md       email structure, tone rules, compliance footer
outreach/emails/<slug>.md  one draft per company
site/index.html            generated review dashboard
site/concepts/<slug>/      one published preview per company
templates/concept-starter/ starting point for a new concept
site/assets/motion.js      shared motion engine, driven by data attributes
scripts/build-dashboard.mjs  regenerates the dashboard, validates the data
scripts/check-concepts.mjs   fails the build if a disclaimer or the CTA scope is missing
scripts/smoke.mjs            renders every concept in Chromium at 360/768/1440
```

## Blocked

Phase 1 needs outbound access to the ten target sites, and every one of them is
currently refused by the environment's egress policy. See
[docs/ACCESS-REQUIREMENTS.md](docs/ACCESS-REQUIREMENTS.md).

## Pipeline

| Phase | Output |
| --- | --- |
| 1 — Analysis | A record in `data/companies.json` with observed findings and the key opportunity |
| 2 — Design | `site/concepts/<slug>/` built on the shared foundation, art-directed to that brand |
| 3 — Preview | Deployed to Cloudflare Pages ([docs/DEPLOY.md](docs/DEPLOY.md)) |
| 4 — Email | A draft in `outreach/emails/<slug>.md` |
| 5 — Approval | Owner reviews the dashboard and approves explicitly — only then is anything sent |

```bash
npm run verify    # build dashboard, validate data, check disclaimers, render in Chromium
open site/index.html
```

## Rules the tooling enforces

- Every concept page carries a discreet **"Website Redesign Concept"** badge and
  a footer stating it is not affiliated with or endorsed by the company, is
  `noindex`, collects no data, and names an address for takedown requests.
- Every concept states **EGP 5,000** alongside its frontend-only scope wording;
  a price without that wording fails the build.
- No preview links to GitHub or offers a source download.
- Every concept renders clean at 360/768/1440 with no JS errors, no sideways
  scroll, and everything visible under `prefers-reduced-motion`.
- No company appears twice, by slug or by domain.
- A contact email without a published source URL fails the build.
- A draft that does not contain its own preview link fails the build.

## Rules the tooling cannot enforce

Nothing about a company, a contact, a problem, a statistic, a testimonial, or a
result is ever invented. A contact that is not published is recorded as
`"Not found"`. Findings describe things actually observed on the live site.
Sending happens once, per company, after explicit approval.
