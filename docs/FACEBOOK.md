# Posting to a Facebook Page

`scripts/facebook-post.mjs` publishes text, link, and photo posts to a Facebook
Page through the Graph API, immediately or on a schedule. It has no
dependencies beyond Node 18+.

## One-time setup

1. **Create a Meta app** at <https://developers.facebook.com/apps> (type
   *Business*). You must be an admin of the Page.
2. **Get a user token.** Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/),
   pick your app, and add the permissions `pages_show_list`,
   `pages_read_engagement`, and `pages_manage_posts`. Click *Generate Access
   Token* and select your Page when Facebook asks which Pages to allow.
3. **Make it long-lived (recommended).** Short Explorer tokens expire in about an
   hour. Exchange it for a 60-day token:

   ```
   https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN
   ```

   A Page token fetched with a long-lived user token does not expire.
4. **Turn it into a Page token.** Put the user token in `.env` and list your Pages:

   ```bash
   echo 'FB_USER_ACCESS_TOKEN=...' >> .env
   node scripts/facebook-post.mjs pages
   ```

   Copy the `FB_PAGE_ID` and `FB_PAGE_ACCESS_TOKEN` lines for your Page into `.env`.
5. **Check it:** `node scripts/facebook-post.mjs whoami`

`.env` is gitignored. The Page token can post publicly as your Page — treat it
like a password and never commit it.

| Variable | Needed for | |
| --- | --- | --- |
| `FB_PAGE_ID` | whoami, post, scheduled | |
| `FB_PAGE_ACCESS_TOKEN` | whoami, post, scheduled | a **Page** token, not a user token |
| `FB_USER_ACCESS_TOKEN` | pages | only to discover the Page token |
| `FB_APP_SECRET` | optional | sends `appsecret_proof`; required if the app has *Require App Secret* on |
| `GRAPH_API_VERSION` | optional | defaults to `v23.0` |

## Posting

`post` **only previews** unless you add `--yes`. A Page post is public the
moment it lands.

```bash
# Text
node scripts/facebook-post.mjs post --message "We're open this Friday." --yes

# Longer text from a file
node scripts/facebook-post.mjs post --message-file posts/launch.txt --yes

# Link with commentary (Facebook builds the preview card)
node scripts/facebook-post.mjs post --link https://example.com/news --message "New on the blog" --yes

# Photo — a local file (JPEG/PNG/GIF/BMP/TIFF) or a public image URL
node scripts/facebook-post.mjs post --image photos/team.jpg --message "Meet the team" --yes

# Scheduled (10 minutes to 30 days ahead; include the time zone)
node scripts/facebook-post.mjs post --message "Good morning" --schedule 2026-10-01T09:00:00+03:00 --yes

# What is queued
node scripts/facebook-post.mjs scheduled
```

A post takes a link **or** a photo, not both — Facebook's API does not combine
them. Put the URL in the message text of a photo post instead.

## When it fails

- **190 / invalid or expired token** — generate a new token (steps 2–4).
- **200 or 10 / permission** — the token is missing `pages_manage_posts` or
  `pages_read_engagement`, you are using a user token instead of a Page token,
  or your role on the Page does not allow creating content (`pages` shows
  `can post: no`).
- An app in *Development* mode can post to Pages its admins manage. Posting on
  behalf of other people's Pages needs Meta App Review.

## Tests

```bash
npm run test:facebook
```
