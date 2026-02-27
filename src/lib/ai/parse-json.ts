/**
 * Safe JSON Parsing for AI Responses
 *
 * Claude sometimes wraps JSON responses in markdown code fences (```json ... ```)
 * even when instructed not to. This utility strips those wrappers before parsing.
 */

/**
 * Extract JSON from an AI response that may contain markdown code fences.
 * Handles:
 * - Plain JSON
 * - ```json ... ``` wrapped JSON
 * - ``` ... ``` wrapped JSON (no language tag)
 * - Leading/trailing whitespace and text
 */
export function parseAiJson<T = unknown>(raw: string): T {
  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // If the response still doesn't start with { or [, try to find the first JSON object
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonStart = cleaned.search(/[{\[]/);
    if (jsonStart !== -1) {
      cleaned = cleaned.substring(jsonStart);
    }
  }

  return JSON.parse(cleaned) as T;
}

/**
 * Safely attempt to parse AI JSON, returning null on failure.
 * Logs the raw response for debugging when parsing fails.
 */
export function safeParseAiJson<T = unknown>(
  raw: string,
  label?: string,
): T | null {
  try {
    return parseAiJson<T>(raw);
  } catch {
    console.error(
      `Failed to parse AI JSON${label ? ` (${label})` : ''}:`,
      raw.substring(0, 500),
    );
    return null;
  }
}
