# Messenger & WhatsApp bot

A Cloudflare Worker that answers Facebook Messenger and/or WhatsApp messages
with Claude, via Meta's APIs. Each channel is optional.

Setup, configuration, and costs:
**[docs/MESSENGER-BOT.md](../docs/MESSENGER-BOT.md)** ·
**[docs/WHATSAPP-BOT.md](../docs/WHATSAPP-BOT.md)**.

```bash
npm install
npm test        # no network, no credentials needed
npm run dev     # local, needs .dev.vars
npm run deploy
npm run tail    # live logs from the deployed Worker
```

```
src/index.js         routing, signature gate, per-message flow
src/whatsapp.js      WhatsApp webhook parsing, Graph API sends, reply chunking
src/messenger.js     Messenger webhook parsing, Send API calls
src/claude.js        the Messages API call
src/conversation.js  KV-backed history and webhook de-duplication
src/signature.js     X-Hub-Signature-256 verification
src/config.js        env bindings, defaults, the number allowlist
```
