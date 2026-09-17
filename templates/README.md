# Concept starter

Copy `concept-starter/` to `site/concepts/<slug>/` to begin a landing page, then
replace the `{{PLACEHOLDERS}}`:

| Placeholder | Meaning |
| --- | --- |
| `{{COMPANY}}` | Company name exactly as they write it |
| `{{COMPANY_URLSAFE}}` | The same name, URL-encoded for the mailto subject |
| `{{DESIGNER_NAME}}` | Your name, as the author of the proposal |
| `{{DESIGNER_EMAIL}}` | The address a company can use to reply or request takedown |

`npm run check` fails the build if the badge, the footer disclosure, or the CTA
scope wording is missing, so none of it can be dropped by accident.

## What each landing page must do

Read [docs/CREATIVE-DIRECTION.md](../docs/CREATIVE-DIRECTION.md) first — it is
the approved brief and it is binding. In short:

- **Landing page only.** The homepage. Not the site.
- Sections chosen from this company's actual business, not from a checklist.
- Keep the company's real name, services, and business facts. No invented
  offerings, prices, clients, testimonials, statistics, or case studies.
- Use only imagery the company has actually published. Where it is weak, carry
  the section with type, colour, scale, and composition instead.
- Design 360px, 768px, and 1440px as three layouts. Start at 360px.
- Ship no functional forms. Decorative fields set `disabled`.
- Motion comes from `assets/motion.js` via data attributes. Do not hand-roll
  scroll listeners — one rAF loop serves the whole page.
- It must not look like the other nine.

## Motion hooks

| Attribute | Effect |
| --- | --- |
| `data-reveal` | Reveal on enter. `up` (default), `fade`, `left`, `right`, `scale` |
| `data-reveal-group` | Staggers descendant reveals |
| `data-reveal-delay="120"` | Explicit delay, ms |
| `data-reveal-clip` | Mask-open reveal for a large visual |
| `data-split` | Splits plain text into masked lines revealed in sequence |
| `data-parallax="0.18"` | Vertical parallax on a large visual |
| `data-scroll-scale="0.9"` | Scales up to 1 across the element's travel |
| `data-hscroll` | Horizontal scroll section — justify it in `notes` |
| `data-magnetic` | Cursor-attracted primary CTA |
| `data-cursor` on `<body>` | Custom cursor — justify it in `notes` |

All of it collapses under `prefers-reduced-motion` and on coarse pointers,
handled centrally.
