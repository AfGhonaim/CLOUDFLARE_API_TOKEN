# Network access required for analysis

Phase 1 cannot run without outbound access to the target sites. As of
2026-09-16 every target domain is refused by this environment's egress policy.

## What was tried

| Method | Result |
| --- | --- |
| `WebFetch` | `EGRESS_BLOCKED` on all ten domains |
| `curl` through the session proxy | `CONNECT tunnel failed, response 403` |
| Chromium (Playwright) through the session proxy | `net::ERR_TUNNEL_CONNECTION_FAILED` |

A 403 on CONNECT is an organization policy denial, not a transient fault. The
proxy documentation is explicit that these are to be reported rather than
worked around, so no bypass was attempted.

## What needs enabling

The environment's **network access policy** has to permit these hosts. This is
set when the environment is created or edited — see
<https://code.claude.com/docs/en/claude-code-on-the-web>.

**Recommended: full outbound network access for this environment.** The work is
inherently "open arbitrary third-party marketing sites and read what they
serve". Those pages pull fonts, images, scripts, and video from hosts that
cannot be enumerated in advance, and a page that half-loads produces a
misleading analysis — worse than no analysis.

If a strict allowlist is required instead, it needs both the apex and `www`
form of each domain:

```
mountainviewegypt.com        www.mountainviewegypt.com
emaarmisr.com                www.emaarmisr.com
orascomdh.com                www.orascomdh.com
madinetmasr.com              www.madinetmasr.com
cityedgedevelopments.com     www.cityedgedevelopments.com
hdg.com.eg                   www.hdg.com.eg
alashraaf.com                www.alashraaf.com
tolipgroup.com               www.tolipgroup.com
visitegypt.tours             www.visitegypt.tours
gsaegy.com                   www.gsaegy.com
```

Plus the asset hosts these sites are likely to depend on:

```
fonts.googleapis.com         fonts.gstatic.com
cdn.jsdelivr.net             cdnjs.cloudflare.com
ajax.googleapis.com          unpkg.com
```

Expect the allowlist to need extending once the pages actually load, because
each site may serve its media from its own CDN subdomain or a third-party host
that is only discoverable by loading the page.

## Fallback if the policy cannot change

Full-page screenshots of each homepage at 1440px and 360px, plus saved HTML
where possible. That is enough for a real analysis. It is the second choice:
screenshots cannot show hover states, scroll behaviour, load performance, or
how navigation actually behaves on a phone.

## What must not happen

No concept may be designed for a site that has not been inspected. The brief
requires identifying each page's real problems, and a redesign built on guessed
problems is a fabricated one.
