/**
 * Webhook authenticity for Meta webhooks (WhatsApp Cloud API and Messenger).
 *
 * Meta signs every webhook POST with an HMAC-SHA256 of the *raw* request body,
 * keyed by the app secret, and sends it as `X-Hub-Signature-256: sha256=<hex>`.
 * Anyone who learns the worker's URL can POST to it, so a request that fails
 * this check is discarded before it reaches the model — it is the only thing
 * standing between a public URL and an API bill.
 */

const encoder = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Length-checked, constant-time string comparison.
 *
 * Comparing with `===` leaks how many leading characters matched through timing,
 * which is enough to forge a signature one nibble at a time.
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * @param {string} rawBody the exact body text, before JSON.parse
 * @param {string|null} header the X-Hub-Signature-256 header value
 * @param {string} appSecret the Meta app secret
 */
export async function verifySignature(rawBody, header, appSecret) {
  if (!header || !appSecret) return false;

  const separator = header.indexOf('=');
  if (separator === -1) return false;

  const scheme = header.slice(0, separator);
  const provided = header.slice(separator + 1);
  if (scheme !== 'sha256' || !provided) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));

  return timingSafeEqual(toHex(signature), provided.toLowerCase());
}
