# Website redesign outreach

A productized redesign offer run as a pipeline: analyse a company's current
site, build a clearly-labelled redesign concept, publish it as a preview, and
send one personalized email. If the company likes the direction, they pay
**$100 USD** for the production-ready frontend code of that design.

## What the $100 covers

The frontend implementation of the approved concept — markup, styles, and
client-side behaviour, responsive and production-ready. It does **not** include
backend or API work, CMS integration, hosting, domains, third-party
integrations, content writing, SEO, or ongoing maintenance. Those are quoted
separately, and no outreach email may imply otherwise.

## Layout

```
data/companies.json        single source of truth for all 100 companies
outreach/TEMPLATE.md       email structure, tone rules, compliance footer
outreach/emails/<slug>.md  one draft per company
site/index.html            generated review dashboard
site/concepts/<slug>/      one published preview per company
templates/concept-starter/ starting point for a new concept
scripts/build-dashboard.mjs  regenerates the dashboard, validates the data
scripts/check-concepts.mjs   fails the build if a disclaimer is missing
```

## Pipeline

| Phase | Output |
| --- | --- |
| 1 — Analysis | A record in `data/companies.json` with observed findings and the key opportunity |
| 2 — Design | `site/concepts/<slug>/` built on the shared foundation, styled to that brand |
| 3 — Preview | Deployed to Cloudflare Pages ([docs/DEPLOY.md](docs/DEPLOY.md)) |
| 4 — Email | A draft in `outreach/emails/<slug>.md` |
| 5 — Approval | Owner reviews the dashboard and approves explicitly — only then is anything sent |

```bash
npm run verify    # build dashboard + validate data + check disclaimers
open site/index.html
```

## Rules the tooling enforces

- Every concept page carries a sticky **"Website Redesign Concept"** banner and
  a footer stating it is not affiliated with or endorsed by the company, is
  `noindex`, collects no data, and names an address for takedown requests.
- No company appears twice, by slug or by domain.
- A contact email without a published source URL fails the build.
- A draft that does not contain its own preview link fails the build.

## Rules the tooling cannot enforce

Nothing about a company, a contact, a problem, a statistic, a testimonial, or a
result is ever invented. A contact that is not published is recorded as
`"Not found"`. Findings describe things actually observed on the live site.
Sending happens once, per company, after explicit approval.
