# data/companies.json

One record per target company. This file is the single source of truth: the
review dashboard, the preview index, and the outreach drafts are all generated
from it.

| Field | Notes |
| --- | --- |
| `slug` | URL-safe id. Becomes `site/concepts/<slug>/` and the preview path. |
| `company` | Legal or trading name as the company writes it. |
| `website` | Current homepage, with scheme. |
| `industry` | Short sector description. |
| `audience` | Who the site is actually selling to — drives the redesign brief. |
| `findings` | 2–5 concrete, observed UX/UI issues. Specific and checkable, never a general verdict. |
| `opportunity` | One sentence: the highest-value change. This is what the email leads with. |
| `contactName` / `contactRole` | `"Not found"` unless published on the company's own site or an official profile. |
| `contactEmail` | `"Not found"` unless published. Never guessed or pattern-derived. |
| `contactSource` | URL where the contact details were published. Required whenever a contact is filled in. |
| `preview` | Deployed concept URL. |
| `subject` | Email subject line for review. |
| `status` | See below. |
| `notes` | Anything a reviewer should know. |

## Status values

`Not started` → `Analyzed` → `Concept built` → `Ready for Review` → `Approved`
→ `Sent`, plus the terminals `Replied`, `Declined`, `Skipped`.

Nothing moves to `Approved` without an explicit instruction from the owner, and
nothing moves to `Sent` without a record of that approval.

## Rules that are not negotiable

- No fabricated contact names, addresses, company facts, or problems. If it is
  not published, it is `"Not found"`.
- Findings must be things actually observed on the live site.
- One company appears once. No duplicate outreach.
