# Posting to a Facebook Page

`scripts/fb-post.mjs` publishes text, link, and photo posts to a Facebook Page
through the Graph API. Nothing else is needed: no server and no Cloudflare.

## One-time setup

1. You need a **Facebook Page** you admin, and a Meta app (type **Business**) at
   [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer),
   pick your app, and add the permissions **`pages_manage_posts`**,
   **`pages_read_engagement`** and **`pages_show_list`**. Click
   **Generate Access Token** and approve.
3. In the Explorer, run `GET me/accounts`. Find your Page in the result and copy
   its **`id`** (that is `FB_PAGE_ID`) and its **`access_token`** (that is
   `FB_PAGE_TOKEN`). Use the Page's token, not the user token at the top.
4. Put both in the environment, or in a `.env` at the repo root (gitignored):

   ```
   FB_PAGE_ID=1234567890
   FB_PAGE_TOKEN=EAAG...
   ```

5. Confirm it works:

   ```bash
   npm run fb:post -- --check
   # OK: token works for Page "Your Page" (1234567890)
   ```

A Page token taken from a short-lived user token expires within hours. For one
that lasts, exchange the user token for a long-lived one first (Access Token
Debugger → **Extend Access Token**), then run `me/accounts` again. The Page
token you get that way does not expire.

## Posting

Every command is a **dry run** until you add `--publish`: it prints exactly
what would be sent and posts nothing.

```bash
# text
npm run fb:post -- --message "We just launched a new concept."

# text with a link preview
npm run fb:post -- --message "See it here" --link https://example.com

# photo with a caption (local file or public URL)
npm run fb:post -- --message "Before and after" --image site/preview.png

# longer text from a file
npm run fb:post -- --file outreach/post.txt

# schedule (10 minutes to 30 days ahead)
npm run fb:post -- --message "Tomorrow at 9" --schedule 2026-09-24T09:00:00+03:00

# when the dry run looks right, add --publish
npm run fb:post -- --message "We just launched a new concept." --publish
```

On success it prints the post id and its facebook.com URL.

## Errors

| Message | Fix |
| --- | --- |
| `token is expired or invalid` | Generate a new Page token (step 3), ideally a long-lived one |
| `lacks pages_manage_posts, or is a user token` | Add the permission in step 2, and use the Page's own `access_token` from `me/accounts` |
| `cannot attach both a link and an image` | Put the link in the message text instead |
