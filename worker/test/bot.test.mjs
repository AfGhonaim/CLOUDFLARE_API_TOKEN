import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { verifySignature, timingSafeEqual } from '../src/signature.js';
import { parseIncoming, chunkText, MAX_BODY_LENGTH } from '../src/whatsapp.js';
import { trimHistory } from '../src/conversation.js';
import { parseAllowlist, isAllowed, normalizeNumber, loadConfig } from '../src/config.js';

const APP_SECRET = 'test-app-secret';

async function sign(body, secret = APP_SECRET) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hex}`;
}

function webhook(messages, contacts = []) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550001111', phone_number_id: 'PNID' },
              contacts,
              messages,
            },
          },
        ],
      },
    ],
  };
}

describe('signature verification', () => {
  it('accepts a signature Meta would have produced', async () => {
    const body = JSON.stringify(webhook([]));
    assert.equal(await verifySignature(body, await sign(body), APP_SECRET), true);
  });

  it('rejects a body that was tampered with in transit', async () => {
    const signature = await sign(JSON.stringify({ a: 1 }));
    assert.equal(await verifySignature(JSON.stringify({ a: 2 }), signature, APP_SECRET), false);
  });

  it('rejects a signature made with the wrong secret', async () => {
    const body = 'payload';
    assert.equal(await verifySignature(body, await sign(body, 'other'), APP_SECRET), false);
  });

  it('rejects a missing, unprefixed, or empty signature', async () => {
    assert.equal(await verifySignature('x', null, APP_SECRET), false);
    assert.equal(await verifySignature('x', 'deadbeef', APP_SECRET), false);
    assert.equal(await verifySignature('x', 'sha256=', APP_SECRET), false);
    assert.equal(await verifySignature('x', 'sha1=deadbeef', APP_SECRET), false);
  });

  it('refuses to compare strings of different lengths', () => {
    assert.equal(timingSafeEqual('abc', 'abcd'), false);
    assert.equal(timingSafeEqual('abc', 'abc'), true);
  });
});

describe('parsing the webhook envelope', () => {
  it('pulls out a text message with the sender profile name', () => {
    const parsed = parseIncoming(
      webhook(
        [{ id: 'wamid.1', from: '201001234567', timestamp: '1700000000', type: 'text', text: { body: 'hello' } }],
        [{ wa_id: '201001234567', profile: { name: 'Ahmed' } }],
      ),
    );
    assert.deepEqual(parsed, [
      { id: 'wamid.1', from: '201001234567', type: 'text', text: 'hello', name: 'Ahmed', timestamp: '1700000000' },
    ]);
  });

  it('ignores delivery receipts, which carry no messages array', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'wamid.1', status: 'delivered' }] } }] }],
    };
    assert.deepEqual(parseIncoming(payload), []);
  });

  it('keeps non-text messages, with empty text, so the caller can answer them', () => {
    const parsed = parseIncoming(webhook([{ id: 'wamid.2', from: '2010', type: 'image', image: { id: 'x' } }]));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].type, 'image');
    assert.equal(parsed[0].text, '');
  });

  it('shrugs off payloads that are not ours', () => {
    assert.deepEqual(parseIncoming(null), []);
    assert.deepEqual(parseIncoming({}), []);
    assert.deepEqual(parseIncoming({ object: 'page', entry: [] }), []);
  });
});

describe('chunking replies', () => {
  it('leaves a short reply alone', () => {
    assert.deepEqual(chunkText('hello'), ['hello']);
  });

  it('returns nothing for empty or blank text', () => {
    assert.deepEqual(chunkText(''), []);
    assert.deepEqual(chunkText('   \n '), []);
    assert.deepEqual(chunkText(null), []);
  });

  it('splits at a paragraph break rather than mid-word', () => {
    const chunks = chunkText(`${'a'.repeat(3000)}\n\n${'b'.repeat(3000)}`);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0], 'a'.repeat(3000));
    assert.equal(chunks[1], 'b'.repeat(3000));
  });

  it('never emits a chunk WhatsApp would reject', () => {
    const chunks = chunkText('word '.repeat(4000));
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= MAX_BODY_LENGTH, `chunk of ${chunk.length} exceeds the limit`);
    }
  });

  it('hard-splits text with no break to split on', () => {
    const chunks = chunkText('x'.repeat(10000));
    assert.equal(chunks.join('').length, 10000);
    for (const chunk of chunks) assert.ok(chunk.length <= MAX_BODY_LENGTH);
  });
});

describe('history trimming', () => {
  const turn = (role, n) => ({ role, content: `${role} ${n}` });

  it('keeps short history untouched', () => {
    const history = [turn('user', 1), turn('assistant', 1)];
    assert.deepEqual(trimHistory(history, 20), history);
  });

  it('keeps the most recent messages', () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      turn(i % 2 === 0 ? 'user' : 'assistant', i),
    );
    const trimmed = trimHistory(history, 4);
    assert.deepEqual(trimmed, history.slice(-4));
  });

  it('drops a leading assistant turn, which the API rejects', () => {
    const history = [turn('user', 1), turn('assistant', 1), turn('user', 2), turn('assistant', 2)];
    const trimmed = trimHistory(history, 3);
    assert.equal(trimmed[0].role, 'user');
    assert.deepEqual(trimmed, [turn('user', 2), turn('assistant', 2)]);
  });
});

describe('the allowlist', () => {
  it('strips formatting so any spelling of a number matches', () => {
    assert.equal(normalizeNumber('+20 (100) 123-4567'), '201001234567');
  });

  it('denies everyone when it is unset', () => {
    for (const raw of [undefined, '', '   ']) {
      const list = parseAllowlist(raw);
      assert.equal(isAllowed(list, '201001234567'), false);
    }
  });

  it('allows everyone only on an explicit star', () => {
    assert.equal(isAllowed(parseAllowlist('*'), '999'), true);
  });

  it('matches listed numbers regardless of formatting', () => {
    const list = parseAllowlist('+20 100 123 4567, 15550001111');
    assert.equal(isAllowed(list, '201001234567'), true);
    assert.equal(isAllowed(list, '15550001111'), true);
    assert.equal(isAllowed(list, '447700900000'), false);
  });
});

describe('configuration', () => {
  const complete = {
    ANTHROPIC_API_KEY: 'sk-ant-test',
    WHATSAPP_TOKEN: 'token',
    WHATSAPP_APP_SECRET: APP_SECRET,
    WHATSAPP_VERIFY_TOKEN: 'verify',
    WHATSAPP_PHONE_NUMBER_ID: 'PNID',
  };

  it('names every missing binding at once', () => {
    assert.throws(() => loadConfig({}), /ANTHROPIC_API_KEY.*WHATSAPP_PHONE_NUMBER_ID/s);
  });

  it('applies defaults for everything optional', () => {
    const config = loadConfig(complete);
    assert.equal(config.model, 'claude-opus-5');
    assert.equal(config.effort, 'low');
    assert.equal(config.maxTokens, 4096);
    assert.equal(config.webhookPath, '/webhook');
    assert.equal(config.historyMessages, 20);
    assert.ok(config.systemPrompt.includes('WhatsApp'));
  });

  it('ignores a non-numeric override instead of producing NaN', () => {
    assert.equal(loadConfig({ ...complete, CLAUDE_MAX_TOKENS: 'lots' }).maxTokens, 4096);
    assert.equal(loadConfig({ ...complete, HISTORY_MESSAGES: '-5' }).historyMessages, 20);
  });
});

describe('the request router', () => {
  let worker;
  let config;
  let ctx;

  beforeEach(async () => {
    worker = (await import('../src/index.js')).default;
    config = {
      ANTHROPIC_API_KEY: 'sk-ant-test',
      WHATSAPP_TOKEN: 'token',
      WHATSAPP_APP_SECRET: APP_SECRET,
      WHATSAPP_VERIFY_TOKEN: 'verify-me',
      WHATSAPP_PHONE_NUMBER_ID: 'PNID',
      ALLOWED_NUMBERS: '',
    };
    ctx = { waitUntil: () => {} };
  });

  const post = (body, signature) =>
    new Request('https://bot.example/webhook', {
      method: 'POST',
      headers: signature ? { 'x-hub-signature-256': signature } : {},
      body,
    });

  it('completes Meta\'s subscription handshake', async () => {
    const url = 'https://bot.example/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1234';
    const response = await worker.fetch(new Request(url), config, ctx);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '1234');
  });

  it('refuses the handshake with the wrong verify token', async () => {
    const url = 'https://bot.example/webhook?hub.mode=subscribe&hub.verify_token=guess&hub.challenge=1234';
    assert.equal((await worker.fetch(new Request(url), config, ctx)).status, 403);
  });

  it('rejects an unsigned webhook', async () => {
    const body = JSON.stringify(webhook([]));
    assert.equal((await worker.fetch(post(body), config, ctx)).status, 401);
  });

  it('accepts a correctly signed webhook', async () => {
    const body = JSON.stringify(
      webhook([{ id: 'wamid.9', from: '201001234567', type: 'text', text: { body: 'hi' } }]),
    );
    const response = await worker.fetch(post(body, await sign(body)), config, ctx);
    assert.equal(response.status, 200);
  });

  it('rejects signed-but-malformed JSON', async () => {
    const body = 'not json';
    const response = await worker.fetch(post(body, await sign(body)), config, ctx);
    assert.equal(response.status, 400);
  });

  it('serves nothing outside the webhook path', async () => {
    const response = await worker.fetch(new Request('https://bot.example/'), config, ctx);
    assert.equal(response.status, 404);
  });

  it('reports misconfiguration instead of crashing', async () => {
    const response = await worker.fetch(new Request('https://bot.example/webhook'), {}, ctx);
    assert.equal(response.status, 500);
  });
});
