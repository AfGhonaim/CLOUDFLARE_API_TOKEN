/**
 * Environment plumbing for the bot.
 *
 * Secrets arrive as Worker secrets (`wrangler secret put`), tuning knobs as
 * plain `[vars]` in wrangler.toml. Everything is read and validated once per
 * request so a missing binding fails loudly at the edge rather than halfway
 * through a conversation.
 */

export const DEFAULT_SYSTEM_PROMPT = [
  'You are a helpful assistant replying over WhatsApp.',
  '',
  'WhatsApp is a chat app, not a document viewer. Keep replies short and',
  'conversational — usually under 1200 characters. Write in plain text: no',
  'markdown headings, no tables, no code fences unless the user asked for code.',
  'WhatsApp supports *bold*, _italic_ and ```monospace``` only.',
  '',
  'Answer in whatever language the user writes in. If you do not know',
  'something, say so rather than guessing.',
].join('\n');

const REQUIRED_SECRETS = [
  'ANTHROPIC_API_KEY',
  'WHATSAPP_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_VERIFY_TOKEN',
];

function intVar(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reduce any phone-number spelling to bare digits, the shape Meta uses for `wa_id`. */
export function normalizeNumber(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Parse ALLOWED_NUMBERS into a matcher.
 *
 * Deliberately deny-by-default: an unset list blocks everyone rather than
 * letting any stranger who finds the number spend the account's tokens.
 * Set it to `*` to run an open bot on purpose.
 */
export function parseAllowlist(raw) {
  const value = String(raw ?? '').trim();
  if (value === '*') return { open: true, numbers: [] };
  const numbers = value
    .split(',')
    .map(normalizeNumber)
    .filter(Boolean);
  return { open: false, numbers };
}

export function isAllowed(allowlist, from) {
  if (allowlist.open) return true;
  return allowlist.numbers.includes(normalizeNumber(from));
}

export function loadConfig(env) {
  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (!env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (missing.length > 0) {
    throw new Error(`Missing required binding(s): ${missing.join(', ')}`);
  }

  return Object.freeze({
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    whatsappToken: env.WHATSAPP_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    graphApiVersion: env.GRAPH_API_VERSION || 'v23.0',
    webhookPath: env.WEBHOOK_PATH || '/webhook',

    allowlist: parseAllowlist(env.ALLOWED_NUMBERS),

    model: env.CLAUDE_MODEL || 'claude-opus-5',
    effort: env.CLAUDE_EFFORT || 'low',
    maxTokens: intVar(env.CLAUDE_MAX_TOKENS, 4096),
    systemPrompt: env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,

    historyMessages: intVar(env.HISTORY_MESSAGES, 20),
    historyTtlSeconds: intVar(env.HISTORY_TTL_SECONDS, 86400),
    chats: env.CHATS ?? null,
  });
}
