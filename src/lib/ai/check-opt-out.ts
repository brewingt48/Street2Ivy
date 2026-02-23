/**
 * AI Training Opt-Out Helper
 *
 * Queries the user's privacy preferences to determine if they have opted
 * out of AI training data usage. Used by AI route handlers to enforce
 * the opt-out flag before sending data to Anthropic.
 */

import { sql } from '@/lib/db';

/**
 * Check whether a user has opted out of AI training.
 * Returns `true` if the user has set `aiTrainingOptOut` to true
 * in their `private_data` JSONB column.
 */
export async function getUserAIOptOut(userId: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT private_data FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) {
      // User not found — default to NOT opted out (fail-open for functionality,
      // but the auth layer should have already rejected unknown users)
      return false;
    }

    const privateData = (rows[0].private_data || {}) as Record<string, unknown>;
    return privateData.aiTrainingOptOut === true;
  } catch (error) {
    console.error('Error checking AI training opt-out:', error);
    // On error, default to not opted out to avoid blocking AI features.
    // The privacy preference is a best-effort signal.
    return false;
  }
}
