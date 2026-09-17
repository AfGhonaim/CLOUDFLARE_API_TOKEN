# WhatsApp bot

A Cloudflare Worker that answers WhatsApp messages with Claude, via the Meta
WhatsApp Cloud API.

Setup, configuration, and costs: **[docs/WHATSAPP-BOT.md](../docs/WHATSAPP-BOT.md)**.

```bash
npm install
npm test        # no network, no credentials needed
npm run dev     # local, needs .dev.vars
npm run deploy
npm run tail    # live logs from the deployed Worker
```

```
src/index.js         routing, signature gate, per-message flow
src/whatsapp.js      webhook parsing, Graph API sends, reply chunking
src/claude.js        the Messages API call
src/conversation.js  KV-backed history and webhook de-duplication
src/signature.js     X-Hub-Signature-256 verification
src/config.js        env bindings, defaults, the number allowlist
```
