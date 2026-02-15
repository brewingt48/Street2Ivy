/**
 * POST /api/ai/chat/stream — Streaming chat via Server-Sent Events
 *
 * Same auth and validation as /api/ai/chat, but streams tokens via SSE
 * using streamClaude() instead of askClaude().
 */

import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { streamClaude } from '@/lib/ai/claude-client';
import { buildCoachingSystemPrompt } from '@/lib/ai/prompts';
import type { ConversationMessage, StudentProfileForAi, QuickAction } from '@/lib/ai/types';

export const dynamic = 'force-dynamic';

const chatStreamSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  quickAction: z.string().optional(),
});

/** Map quick action keys to human-readable context descriptions */
const QUICK_ACTION_LABELS: Record<QuickAction, string> = {
  resume_review: 'resume review',
  interview_prep: 'interview preparation',
  cover_letter: 'cover letter writing',
  career_advice: 'career advice',
  skill_gap: 'skill gap analysis',
  general: 'general career coaching',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (session.data.role !== 'student') {
      return new Response(JSON.stringify({ error: 'AI coaching is available to students only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const parsed = chatStreamSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, message, quickAction } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'student_coaching');
    if (!accessCheck.allowed) {
      return new Response(JSON.stringify({ error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify conversation exists and is owned by user
    const conversations = await sql`
      SELECT id FROM ai_conversations
      WHERE id = ${conversationId} AND user_id = ${userId}
    `;

    if (conversations.length === 0) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save user message
    await sql`
      INSERT INTO ai_messages (conversation_id, role, content)
      VALUES (${conversationId}, 'user', ${message})
    `;

    // Build student profile
    const userRows = await sql`
      SELECT display_name, university, major, graduation_year, gpa, bio, sports_played, activities
      FROM users
      WHERE id = ${userId}
    `;

    const user = userRows[0] || {};

    const skillRows = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${userId}
    `;

    const studentProfile: StudentProfileForAi = {
      name: (user.display_name as string) || 'Student',
      university: (user.university as string) || null,
      major: (user.major as string) || null,
      graduationYear: (user.graduation_year as string) || null,
      gpa: (user.gpa as string) || null,
      bio: (user.bio as string) || null,
      skills: skillRows.map((s: Record<string, unknown>) => s.name as string),
      sportsPlayed: (user.sports_played as string) || null,
      activities: (user.activities as string) || null,
    };

    // Fetch last 20 messages for context
    const historyRows = await sql`
      SELECT role, content
      FROM ai_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const conversationHistory: ConversationMessage[] = historyRows
      .reverse()
      .map((m: Record<string, unknown>) => ({
        role: m.role as ConversationMessage['role'],
        content: m.content as string,
      }));

    // Build system prompt
    const systemPrompt = buildCoachingSystemPrompt(studentProfile);

    // If quickAction is set, prepend context
    if (quickAction && quickAction in QUICK_ACTION_LABELS) {
      const label = QUICK_ACTION_LABELS[quickAction as QuickAction];
      conversationHistory.unshift({
        role: 'user',
        content: `[Context: The student is asking for help with: ${label}]`,
      });
    }

    // Stream response via SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          for await (const delta of streamClaude({
            model: accessCheck.config.model,
            systemPrompt,
            messages: conversationHistory,
            maxTokens: 2048,
          })) {
            fullResponse += delta;
            controller.enqueue(
              encoder.encode(`event: token\ndata: ${JSON.stringify({ text: delta })}\n\n`)
            );
          }

          // Save complete assistant response
          await sql`
            INSERT INTO ai_messages (conversation_id, role, content)
            VALUES (${conversationId}, 'assistant', ${fullResponse})
          `;

          // Increment usage
          await incrementUsageV2(tenantId, userId, 'student_coaching');

          // Update conversation title if first user message
          const messageCount = await sql`
            SELECT COUNT(*) as count FROM ai_messages
            WHERE conversation_id = ${conversationId} AND role = 'user'
          `;

          if (parseInt(messageCount[0].count as string) === 1) {
            const autoTitle = message.length > 50 ? message.substring(0, 50) + '...' : message;
            await sql`
              UPDATE ai_conversations
              SET title = ${autoTitle}, updated_at = NOW()
              WHERE id = ${conversationId}
            `;
          } else {
            await sql`
              UPDATE ai_conversations SET updated_at = NOW()
              WHERE id = ${conversationId}
            `;
          }

          // Send done event with full response and usage
          const usage = await getUsageStatusV2(tenantId, userId, 'student_coaching');
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({ content: fullResponse, usage })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error('AI stream error:', error);
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'AI response failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI chat stream error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
