/**
 * Claude API Client
 *
 * Wrapper around the Anthropic SDK for the Campus2Career platform.
 * Provides both synchronous and streaming interfaces.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeOptions, ConversationMessage } from './types';

// Lazy-initialized client (only created when first used)
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Convert our ConversationMessage format to Anthropic SDK format.
 * Filters out system messages (handled separately).
 */
function toAnthropicMessages(
  messages: ConversationMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

/**
 * Send a message to Claude and get a complete response.
 * Includes retry logic with exponential backoff.
 */
export async function askClaude(options: ClaudeOptions): Promise<string> {
  const { model, systemPrompt, messages, maxTokens = 2048 } = options;
  const anthropic = getClient();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: toAnthropicMessages(messages),
      });

      // Extract text from response
      const textBlock = response.content.find((block) => block.type === 'text');
      return textBlock?.text || '';
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors or invalid requests
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.BadRequestError) {
        throw error;
      }

      // Retry on rate limits and server errors with exponential backoff
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to get response from Claude');
}

/**
 * Stream a response from Claude.
 * Yields text deltas as they arrive.
 */
export async function* streamClaude(
  options: ClaudeOptions
): AsyncGenerator<string, void, unknown> {
  const { model, systemPrompt, messages, maxTokens = 2048 } = options;
  const anthropic = getClient();

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: toAnthropicMessages(messages),
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
