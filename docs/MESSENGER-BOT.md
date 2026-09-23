# Facebook Messenger bot

The same Worker in [`worker/`](../worker) that answers WhatsApp can answer
messages sent to a **Facebook Page** instead — or as well. WhatsApp is optional:
set only the Messenger secrets and the WhatsApp code path stays switched off.

```
you ──▶ Messenger ──▶ your Facebook Page ──▶ Worker ──▶ Claude API
                                                │
                                             Workers KV
                                         (history + dedup)
```

Everything after the webhook arrives — allowlist, de-duplication, history,
the Claude call, `/reset` — is shared with the WhatsApp bot; see
[WHATSAPP-BOT.md](WHATSAPP-BOT.md) for how that part works and what it costs.

## Setup

### 1. Meta: a Page and an app

1. You need a **Facebook Page** (not a personal profile). Create one at
   [facebook.com/pages/create](https://www.facebook.com/pages/create) if you
   do not have one.
2. At [developers.facebook.com/apps](https://developers.facebook.com/apps)
   create an app of type **Business** and add the **Messenger** product.
3. Under **App settings → Basic**, copy the **App secret**.
4. Under **Messenger → Messenger API Settings → Generate access tokens**,
   connect your Page and click **Generate**. That is the **Page access token**.

While the app is in **Development** mode, only people with a role on the app
(you, as its admin) can message the bot. That is exactly right for testing.

### 2. Cloudflare: deploy the Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create CHATS    # paste the id into wrangler.toml

npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put META_APP_SECRET
npx wrangler secret put META_VERIFY_TOKEN       # any random string you invent
npx wrangler secret put MESSENGER_PAGE_TOKEN

npm run deploy
```

Check the handshake before involving Meta — this should print `hello`:

```bash
curl "https://whatsapp-claude-bot.<you>.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=<your verify token>&hub.challenge=hello"
```

### 3. Meta: point the webhook at it

Under **Messenger → Messenger API Settings → Configure webhooks**:

- **Callback URL** — your Worker URL with `/webhook` on the end
- **Verify token** — the same string you gave `META_VERIFY_TOKEN`

Click **Verify and save**. Then, in the Page list on the same screen, click
**Add subscriptions** next to your Page and tick **messages**.

### 4. Let yourself in

The allowlist denies everyone by default, and Messenger identifies you by a
page-scoped id (PSID) you cannot look up in advance. So:

1. Run `npm run tail`.
2. Message your Page from your own Facebook account.
3. The log shows `Ignoring messenger message from 24xxxxxxxxxxxxx: not in MESSENGER_ALLOWED_IDS`.
4. Put that number into `MESSENGER_ALLOWED_IDS` in `wrangler.toml` and run
   `npm run deploy` again.

Message the Page again — Claude replies.

## Configuration

| Name | Kind | What it is |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | secret | From [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `META_APP_SECRET` | secret | Signs inbound webhooks. `WHATSAPP_APP_SECRET` is accepted too |
| `META_VERIFY_TOKEN` | secret | Shared string for the handshake. `WHATSAPP_VERIFY_TOKEN` is accepted too |
| `MESSENGER_PAGE_TOKEN` | secret | Page access token; setting it turns Messenger on |
| `MESSENGER_ALLOWED_IDS` | var | Comma-separated PSIDs that may use the bot; `*` opens it to everyone |

The Claude and history settings are the same as for WhatsApp.

## Worth knowing

**Plain text only.** Messenger shows markdown symbols literally, so the
built-in Messenger prompt asks Claude for plain text. Replies over 2000
characters are split into several messages.

**The 24-hour window applies here too.** A Page may reply freely within 24
hours of the person's last message. The bot only ever answers, so it stays
inside that window, but it cannot message anyone first.

**Going public** means switching the app to **Live** and passing Meta's App
Review for the `pages_messaging` permission. You do not need either to use the
bot yourself.
