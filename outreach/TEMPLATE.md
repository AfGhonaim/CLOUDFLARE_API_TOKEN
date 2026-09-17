# Outreach drafts

One file per company: `outreach/emails/<slug>.md`, matching a `slug` in
`data/companies.json`. `npm run build` pulls each draft into the review
dashboard and fails if a draft is missing its preview link.

## File format

```
---
to: person@company.com
subject: A redesign concept for the <Company> homepage
---

<body>
```

## Structure

Six moves, in order, and nothing else:

1. One line saying you looked at their site. No compliment, no preamble.
2. One or two **specific, observed** opportunities. Name the element and the
   behaviour — "the quote request sits three clicks in" beats "the UX could be
   better".
3. One line: you built a landing page redesign concept for them specifically.
4. The preview link on its own line.
5. The offer, stated plainly and with its limits: **EGP 5,000 for the
   production-ready frontend code** of the redesigned landing page.
6. One question as the CTA. One. Not "let me know / happy to call / also I
   could do your SEO".

Then the signature block and the compliance footer below.

Target: 120–160 words before the signature. If it runs longer, cut move 2 down
to a single finding.

## Language

Use: "I noticed a few opportunities to improve the visual hierarchy", "the
navigation could carry fewer top-level items", "the mobile layout stacks in a
way that pushes the contact details below three screens of content".

Never use: "your website is outdated / terrible / losing you customers",
"in today's digital landscape", "leverage", "unlock", "supercharge", "game
changer", "I hope this email finds you well", "as an AI", invented numbers
("you're losing 40% of visitors"), or fake familiarity ("love what you're
doing!").

No more than one exclamation mark across the whole batch. No emojis.

## Scope discipline

EGP 5,000 buys the responsive frontend implementation of the concept page.
Say so, and do not imply it covers: backend or API work, CMS integration,
hosting, domains, third-party integrations, content production, SEO, or
ongoing maintenance. If a company asks about those, they are quoted separately.

## Compliance footer

Every email ends with the signature block, a real postal address, and a
one-line opt-out. Cold commercial email requires all three under CAN-SPAM, and
the opt-out must be honoured within 10 business days. Recipients in the EU/UK
carry additional consent rules under GDPR/PECR — check before adding EU/UK
companies to the list, and drop anyone who asks, permanently, in
`data/companies.json` as `Declined`.

---

## Worked example

```
---
to: hello@examplecompany.com
subject: A redesign concept for the Example Co homepage
---

Hi <Name>,

I spent some time on examplecompany.com this week while looking at sites in the
logistics space, and two things stood out as opportunities.

The main navigation carries eleven top-level items, which makes the two pages
that actually drive enquiries hard to find. And the quote request — the one
action the site is built around — is three clicks from the homepage and is not
mentioned above the fold.

I put together a landing page redesign concept for Example Co to show what a
tighter version could look like. It keeps your brand and your existing content, and reorganises
the journey around the quote request:

https://redesign-concepts.pages.dev/concepts/example-co/

It is a concept, not a live site. If the direction works for you, I can deliver
the production-ready frontend code for it for EGP 5,000. That covers the
frontend implementation itself — backend work, CMS, and hosting would be
separate.

Worth a short reply either way: does this direction look right to you?

<Your name>
<Title> · <portfolio URL>
<Business postal address>

Prefer not to hear from me again? Reply with "no thanks" and I will not contact
you again.
```
