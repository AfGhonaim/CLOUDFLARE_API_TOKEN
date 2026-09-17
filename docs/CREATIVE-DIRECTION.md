# Creative direction — locked

Approved by the project owner before design began, and revised once the target
list was known. These decisions hold across all landing pages. Deviating from
them on an individual company requires an explicit exception, recorded in that
company's `notes` field.

The list is nine Egyptian real estate and hospitality brands plus one design
consultancy. That concentration is the main risk to the requirement that no two
pages look alike, so differentiation is carried deliberately by typeface
pairing, mode, grid, and imagery treatment per company — not left to chance.

## Scope

**Landing page only.** One page per company: the homepage. Not the site. No
inner pages, no navigation targets beyond in-page anchors.

## 1. Visual direction — bold editorial, Apple pacing

**The look is editorial.** Magazine logic: a strong, visible grid; decisive
type pairing; generous measure; pull quotes and captions used as real
hierarchy; typography carrying the page rather than decoration. This is also
the pragmatic choice for this list, because developer photography is uneven and
editorial layout survives weak imagery where a photo-led minimal layout does
not.

**The behaviour is Apple's.** One idea per viewport, progressive reveal,
controlled motion, generous whitespace, sticky narrative where a sequence earns
it. Apple is the reference for **interaction quality, pacing, and storytelling
discipline only**. No Apple layout, component, asset, typeface, copy pattern, or
brand element is reproduced. If a section would read as recognisably Apple's
rather than as the company's own, it is wrong.

## 2. Mode — chosen per company

Light or dark is an art-direction decision made per brand, recorded in that
company's record. A luxury or technology brand may run dark; a healthcare or
professional-services brand generally should not. The choice must be defensible
from the company's existing identity, not from variety for its own sake.

## 3. Typography — bold oversized headlines, Arabic-ready

Display type carries the hierarchy. Tight tracking at large sizes, decisive
scale jumps between levels, body text never below 16px.

The typeface changes per company and must relate to that company's existing
identity. The *scale and confidence* stay constant; the voice does not. With
an editorial system, type pairing is the primary means of making ten pages
look like ten brands — so no pairing may be reused across companies.

**Arabic-ready stack.** Every company on this list serves an Arabic-speaking
audience. Concepts ship in English, but each display and body face must have a
genuine Arabic companion (IBM Plex Sans Arabic, Cairo, Almarai, Noto Kufi
Arabic, Baloo Bhaijaan 2 and similar), recorded in that company's `notes`, so
an Arabic/RTL version is a real follow-on rather than a retrofit. Logical
properties (`margin-inline`, `padding-inline`, `text-align: start`) are used
throughout for the same reason.

## 4. Motion — premium / smooth

Approved techniques, applied only where they serve the company's story:

| Technique | Use |
| --- | --- |
| Scroll-triggered reveals | The default. Every major section. |
| Split-text headline reveals | Hero and section openers. |
| Image clip / mask reveals | Large visuals on first appearance. |
| Gentle parallax | Large background visuals only. |
| Sticky storytelling | Where a sequence genuinely has steps. |
| Scroll-driven scale | Hero visuals, sparingly. |
| Hover micro-interactions | Buttons, links, cards, nav. Desktop only. |
| Magnetic buttons | Primary CTA only. |
| Image zoom on hover | Project and product cards. |
Horizontal scroll and the custom cursor are **not in the approved set**. The
engine still supports both; neither ships without the owner asking for it.

Motion communicates hierarchy and sequence. Motion that only demonstrates
motion is removed.

### Mobile motion — reduced set

Below 768px, parallax, scroll-driven scale, and horizontal scroll are switched
off entirely. Scroll reveals and text staggers stay. Pointer effects are
already off on touch. This is enforced centrally in `motion.js`, not per page:
most of this audience is on mid-range Android, and those three effects are what
cost frames there.

## 5. Performance — balanced impact and performance

- Animate `transform` and `opacity` only. No animated layout properties.
- Every visual below the fold is lazy-loaded; the hero visual is not.
- `prefers-reduced-motion: reduce` disables all motion and reveals content in
  its final state. This is enforced in `site/assets/motion.js`, not left to
  each concept.
- Pointer-driven effects (magnetic, custom cursor) are disabled on coarse
  pointers rather than degraded.
- Target: the page feels smooth on a mid-range Android phone, because that is
  what a prospect will open the link on.

## 6. Imagery — the company's own assets, plus typographic art direction

Only imagery the company has actually published: their logo, their photography,
their products. Where that imagery is weak or absent, the section is carried by
type, colour, scale, and composition. No stock photography standing in for a
company's premises, staff, work, or products. Nothing is invented.

## 7. Responsive

Three breakpoints designed, not scaled: **360px, 768px, 1440px**. Typography
scale, spacing rhythm, navigation pattern, image treatment, section order, and
motion are each reconsidered per breakpoint. The 360px case is designed first.

## 8. Commercial CTA

Every landing page closes with a CTA before the footer:

> **Like this direction?** Get the production version — **EGP 5,000**

This covers the **responsive frontend implementation and production-ready
frontend code of this page**. It does not include backend development, CMS
integration, hosting, domains, third-party integrations, content production,
SEO, or ongoing maintenance. No page or email may imply otherwise.

One CTA. One action.

## 9. Concept labelling

Discreet, never distracting — and never absent:

- A small fixed badge reading **"Website Redesign Concept"**, expandable to the
  full disclosure, present on every page.
- A footer disclosure stating the page is an independent proposal, not
  affiliated with or endorsed by the company, that trademarks remain their
  owners', that no data is collected, and giving a takedown address.
- `<title>` carries "Website Redesign Concept".
- `noindex, nofollow`, reinforced by `X-Robots-Tag`.

No GitHub links, repository references, source downloads, or code on any
preview.

## 10. What these pages must never look like

Generic AI aesthetics. SaaS templates. Gradient soup. Unmotivated
glassmorphism. Rounded cards everywhere. Floating 3D blobs. Corporate-Memphis
illustration. Fake dashboards. Shadow stacks. Ten pages that share a skeleton.
