# Concept starter

Copy `concept-starter/` to `site/concepts/<slug>/` to begin a new redesign, then
replace the `{{PLACEHOLDERS}}`:

| Placeholder | Meaning |
| --- | --- |
| `{{COMPANY}}` | Company name exactly as they write it |
| `{{DESIGNER_NAME}}` | Your name, as the author of the proposal |
| `{{DESIGNER_EMAIL}}` | The address a company can use to request takedown |

`npm run check` fails the build if the banner or footer is missing, so the
disclaimer cannot be dropped by accident.

## What each concept must do

- Keep the company's real name, services, and business facts. No invented
  offerings, prices, testimonials, statistics, or case studies.
- Keep recognisable brand equity (logo wordmark, primary colour) unless the
  brief says otherwise; modernise typography, spacing, hierarchy, and flow.
- Work at 360px, 768px, and 1440px. Check the 360px case first.
- Ship no functional forms. Inputs may be shown as visual design only, with
  `disabled` set, so nothing can be submitted or collected.
- Look like the company's own product site, not like the other 99 concepts.
