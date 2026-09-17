# WhatsApp bot

A Cloudflare Worker that receives WhatsApp messages through the Meta Cloud API,
asks Claude, and replies. It is self-contained in [`worker/`](../worker) and
shares nothing with the redesign-outreach pipeline except the repository.

```
you ──▶ WhatsApp ──▶ Meta Cloud API ──▶ Worker ──▶ Claude API
                                          │
                                       Workers KV
                                   (history + dedup)
```

## How a message flows

Meta drives everything through one URL. A `GET` carries the subscription
handshake; every inbound message is a `POST` signed with your app secret.

`src/index.js` verifies the signature, hands the work to `ctx.waitUntil()`, and
returns `200` immediately — Meta retries any webhook it does not see
acknowledged within seconds, so the model call has to happen *after* the
response has gone out. Then, per message: check the allowlist, drop duplicate
deliveries, mark read, replay the thread from KV, call Claude, send the reply in
≤4096-character chunks, save the turn back.

## Setup

### 1. Meta: create the app

1. At [developers.facebook.com](https://developers.facebook.com/apps) create an
   app of type **Business** and add the **WhatsApp** product.
2. Under **WhatsApp → API Setup**, note the **Phone number ID**. Meta gives you
   a free test number to start with; you can attach your own later.
3. Still on API Setup, add your personal number under **To** — Meta's test
   number will only talk to numbers you register there.
4. Under **App settings → Basic**, copy the **App secret**.

The 24-hour token on the API Setup page is fine for a first test. For anything
lasting, create a System User in **Business settings → Users → System users**,
give it the `whatsapp_business_messaging` permission, and generate a token with
no expiry.

### 2. Cloudflare: deploy the Worker

```bash
cd worker
npm install

# Conversation history and webhook de-duplication.
npx wrangler kv namespace create CHATS
```

Put the printed namespace id into `wrangler.toml`, along with your
`WHATSAPP_PHONE_NUMBER_ID` and your own number in `ALLOWED_NUMBERS`. Then set
the four secrets and deploy:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put WHATSAPP_APP_SECRET
npx wrangler secret put WHATSAPP_VERIFY_TOKEN   # any random string you invent

npm run deploy
```

Deploy prints the Worker URL, e.g. `https://whatsapp-claude-bot.<you>.workers.dev`.

### 3. Meta: point the webhook at it

Under **WhatsApp → Configuration → Webhook**, click **Edit**:

- **Callback URL** — your Worker URL with `/webhook` on the end
- **Verify token** — the same string you gave `WHATSAPP_VERIFY_TOKEN`

Save. Meta immediately sends the `GET` handshake; the Worker echoes the
challenge back and the field list appears. Subscribe to **messages** — that one
field is all the bot needs.

Now message the number from a phone in `ALLOWED_NUMBERS`. `npm run tail`
streams the logs live.

## Configuration

Secrets, set with `wrangler secret put`:

| Name | What it is |
| --- | --- |
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `WHATSAPP_TOKEN` | Meta access token used to send messages |
| `WHATSAPP_APP_SECRET` | Signs inbound webhooks — this is what keeps the URL from being open to the world |
| `WHATSAPP_VERIFY_TOKEN` | Shared string for the subscription handshake |

Plain vars, in `wrangler.toml`:

| Name | Default | What it does |
| --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | — | Meta's numeric id for the sending number |
| `ALLOWED_NUMBERS` | — | Comma-separated numbers that may use the bot; `*` opens it to everyone |
| `GRAPH_API_VERSION` | `v23.0` | Graph API version in the send URL |
| `WEBHOOK_PATH` | `/webhook` | Path Meta posts to |
| `CLAUDE_MODEL` | `claude-opus-5` | Any current model id |
| `CLAUDE_EFFORT` | `low` | `low`…`max`; chat rarely needs more, and low keeps replies quick |
| `CLAUDE_MAX_TOKENS` | `4096` | Ceiling per reply |
| `SYSTEM_PROMPT` | see `src/config.js` | Give the bot a different personality or job |
| `HISTORY_MESSAGES` | `20` | Messages of context replayed each turn |
| `HISTORY_TTL_SECONDS` | `86400` | How long an idle thread is remembered |

Send `/reset` (or `/clear`, `/new`) in the chat to wipe that conversation's
history.

## Two things worth knowing before you run it

**The allowlist denies by default.** Leave `ALLOWED_NUMBERS` unset and the bot
answers nobody. That is deliberate: the webhook URL is public, and anyone who
finds your WhatsApp number would otherwise be spending your API credits. You
have to name yourself before it will talk to you.

**Replies are free-form, so they depend on the 24-hour window.** WhatsApp only
lets a business send free-form text within 24 hours of the user's last message.
This bot only ever answers, never initiates, so it stays inside that window —
but it also means it cannot message you first. That would need an approved
message template.

## Costs

Two meters run at once. Claude is billed per token — Opus 5 is $5/$25 per
million input/output tokens; switching `CLAUDE_MODEL` to `claude-sonnet-5`
($2/$10) or `claude-haiku-4-5` ($1/$5) cuts that if chat volume grows. Note that
`HISTORY_MESSAGES` multiplies input cost: every turn resends the whole thread.

Meta bills conversations separately and has changed the model more than once —
check [their current pricing](https://developers.facebook.com/docs/whatsapp/pricing)
rather than trusting a number written down here.

Cloudflare's free tier covers a personal bot comfortably.

## Local development

```bash
cd worker
cp .dev.vars.example .dev.vars    # fill in the four secrets; gitignored
npm run dev
```

`wrangler dev` serves on localhost, which Meta cannot reach. To take real
traffic locally, expose it with a tunnel (`cloudflared tunnel --url
http://localhost:8787`) and point the Meta webhook at the tunnel URL.

```bash
npm test     # 31 tests, no network: signatures, parsing, chunking, routing
```

## Extending it

The obvious next step is images: an inbound `type: "image"` message carries a
media id, which you exchange for a URL at `GET /{media-id}` and then fetch with
the same bearer token. Base64 it into an `image` content block and Claude reads
it. `src/index.js` currently answers non-text messages with a polite refusal —
that is the place to hook it in.

Voice notes work the same way through `type: "audio"`, with a transcription step
in between.
