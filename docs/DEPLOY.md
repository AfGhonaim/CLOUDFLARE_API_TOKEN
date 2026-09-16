# Deploying previews to Cloudflare Pages

The whole `site/` directory deploys as one static project. Each company's
preview is a path inside it, so all 100 previews live behind one project and
one optional custom domain.

```
site/
  index.html              internal review dashboard
  assets/                 shared foundation
  concepts/<slug>/        one company preview per directory
```

## One-time setup

1. In the Cloudflare dashboard, create an API token with the **Cloudflare
   Pages: Edit** permission. Nothing broader is needed.
2. Note your **Account ID** from the dashboard sidebar.
3. Copy `.env.example` to `.env` and fill both values. `.env` is gitignored —
   never commit it.

## Deploy

```bash
npm run verify     # builds the dashboard and checks every disclaimer
npx wrangler pages project create redesign-concepts --production-branch main   # first run only
npm run deploy
```

Previews then resolve at:

```
https://redesign-concepts.pages.dev/concepts/<slug>/
```

## Before sending anything

- `npm run verify` must pass. It fails on a missing disclaimer, an unreplaced
  template placeholder, a duplicate company, a contact email with no source, or
  a draft that does not contain its own preview link.
- Open a sample of previews on a real phone. The 360px case is where concept
  pages break.
- Confirm every preview URL in the dashboard returns 200.

## Taking a preview down

If a company asks, delete `site/concepts/<slug>/`, set their status to
`Declined` in `data/companies.json`, redeploy, and reply to confirm. Same-day.
