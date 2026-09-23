/**
 * A WhatsApp and Facebook Messenger bot backed by Claude, on Cloudflare Workers.
 *
 * Meta drives the whole thing through one URL: a GET handshake to prove the
 * endpoint is ours, then a signed POST for every inbound message. Meta retries
 * a webhook it does not see acknowledged quickly, so the POST handler verifies
 * the signature, hands the work to `waitUntil`, and returns 200 straight away —
 * the model call happens after the response has already gone out.
 *
 * Both channels hang off the same Meta app, so they share that one URL, the
 * handshake, and the signature check; the payload's `object` field says which
 * channel an event belongs to.
 */

import { loadConfig, isAllowed, defaultSystemPrompt } from './config.js';
import { verifySignature, timingSafeEqual } from './signature.js';
import * as whatsapp from './whatsapp.js';
import * as messenger from './messenger.js';
import { loadHistory, saveHistory, clearHistory, alreadyHandled, trimHistory } from './conversation.js';
import { askClaude } from './claude.js';

const UNSUPPORTED_TYPE_REPLY =
  'I can only read text messages at the moment — send me a message and I will reply.';

/** What differs between channels; everything else in the flow is shared. */
const CHANNELS = [
  {
    name: 'whatsapp',
    enabled: (config) => config.whatsappEnabled,
    parseIncoming: whatsapp.parseIncoming,
    sendText: whatsapp.sendText,
    markRead: (config, message) => whatsapp.markReadAndTyping(config, message.id),
    allowlist: (config) => config.allowlist,
    allowlistVar: 'ALLOWED_NUMBERS',
    historyKey: (message) => message.from,
  },
  {
    name: 'messenger',
    enabled: (config) => config.messengerEnabled,
    parseIncoming: messenger.parseIncoming,
    sendText: messenger.sendText,
    markRead: (config, message) => messenger.markSeenAndTyping(config, message.from),
    allowlist: (config) => config.messengerAllowlist,
    allowlistVar: 'MESSENGER_ALLOWED_IDS',
    // Page-scoped ids and phone numbers are both bare digits; keep them apart.
    historyKey: (message) => `messenger:${message.from}`,
  },
];

/** GET /webhook — Meta's subscription handshake. */
function handleVerification(url, config) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && timingSafeEqual(token, config.verifyToken)) {
    return new Response(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return new Response('Forbidden', { status: 403 });
}

/** Handle one inbound message, start to finish. Runs after the 200 is sent. */
async function handleMessage(config, channel, message) {
  if (!isAllowed(channel.allowlist(config), message.from)) {
    // For Messenger this log line is how you learn your own page-scoped id.
    console.log(`Ignoring ${channel.name} message from ${message.from}: not in ${channel.allowlistVar}`);
    return;
  }
  if (await alreadyHandled(config, message.id)) {
    console.log(`Ignoring duplicate delivery of ${message.id}`);
    return;
  }

  const sendText = (text) => channel.sendText(config, message.from, text);
  const historyKey = channel.historyKey(message);

  // Cosmetic; never let it block the reply.
  await channel.markRead(config, message).catch((error) => {
    console.warn('Could not mark read:', error.message);
  });

  if (message.type !== 'text' || !message.text.trim()) {
    await sendText(UNSUPPORTED_TYPE_REPLY);
    return;
  }

  const body = message.text.trim();

  if (/^\/(reset|clear|new)$/i.test(body)) {
    await clearHistory(config, historyKey);
    await sendText('Done — fresh start. What would you like to talk about?');
    return;
  }

  const history = trimHistory(
    [...(await loadHistory(config, historyKey)), { role: 'user', content: body }],
    config.historyMessages,
  );

  let reply;
  try {
    reply = await askClaude(config, history, config.systemPrompt ?? defaultSystemPrompt(channel.name));
  } catch (error) {
    console.error('Claude call failed:', error);
    await sendText('Something went wrong reaching Claude. Give it another go in a moment.');
    return;
  }

  const text = reply.text || "I didn't manage to put an answer together — try rephrasing?";
  await sendText(text);

  // A refusal or a truncated answer is still a real assistant turn: keeping it
  // in the thread is what stops Claude from repeating itself on the next one.
  await saveHistory(config, historyKey, [...history, { role: 'assistant', content: text }]);

  console.log(
    `Replied to ${channel.name} ${message.from} (${reply.model}, in=${reply.usage?.input_tokens ?? '?'}, ` +
      `out=${reply.usage?.output_tokens ?? '?'}${reply.truncated ? ', truncated' : ''})`,
  );
}

/** POST /webhook — a signed batch of events. */
async function handleWebhook(request, config, ctx) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!(await verifySignature(rawBody, signature, config.appSecret))) {
    console.warn('Rejected a webhook with a bad or missing signature');
    return new Response('Invalid signature', { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Malformed JSON', { status: 400 });
  }

  for (const channel of CHANNELS) {
    if (!channel.enabled(config)) continue;
    for (const message of channel.parseIncoming(payload)) {
      ctx.waitUntil(
        handleMessage(config, channel, message).catch((error) => {
          console.error(`Failed handling ${channel.name} ${message.id}:`, error);
        }),
      );
    }
  }

  // Always 200 once the signature checks out, so Meta stops retrying.
  return new Response('EVENT_RECEIVED', { status: 200 });
}

export default {
  async fetch(request, env, ctx) {
    let config;
    try {
      config = loadConfig(env);
    } catch (error) {
      console.error('Configuration error:', error.message);
      return new Response('Worker is misconfigured', { status: 500 });
    }

    const url = new URL(request.url);
    if (url.pathname !== config.webhookPath) {
      return new Response('Not found', { status: 404 });
    }

    if (request.method === 'GET') return handleVerification(url, config);
    if (request.method === 'POST') return handleWebhook(request, config, ctx);

    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  },
};
