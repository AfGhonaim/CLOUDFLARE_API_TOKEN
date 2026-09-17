/**
 * The Claude call.
 *
 * Non-streaming on purpose: WhatsApp has no concept of a partial message, so
 * there is nothing to stream into — the reply is sent once it is complete.
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Server-side refusal fallback. If a safety classifier declines the request,
 * the API re-runs it on a fallback model inside the same call instead of
 * leaving the user staring at silence. `"default"` lets Anthropic route by
 * refusal category so there is no model list to maintain here.
 */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * @param {ReturnType<import('./config.js').loadConfig>} config
 * @param {Array<{role: 'user'|'assistant', content: string}>} history full thread, oldest first
 */
export async function askClaude(config, history) {
  const client = new Anthropic({ apiKey: config.anthropicApiKey, maxRetries: 2 });

  const response = await client.beta.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: config.systemPrompt,
    // Chat is latency-sensitive and rarely needs deep reasoning, so effort
    // defaults to "low"; raise CLAUDE_EFFORT for a bot that does harder work.
    output_config: { effort: config.effort },
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    messages: history,
  });

  if (response.stop_reason === 'refusal') {
    return {
      text: "Sorry — I can't help with that one. Ask me something else?",
      refused: true,
      truncated: false,
      usage: response.usage,
      model: response.model,
    };
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n')
    .trim();

  return {
    text,
    refused: false,
    truncated: response.stop_reason === 'max_tokens',
    usage: response.usage,
    model: response.model,
  };
}
