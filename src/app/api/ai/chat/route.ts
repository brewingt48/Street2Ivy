/**
 * POST /api/ai/chat — Send a message and get AI response (non-streaming)
 *
 * Validates AI access, saves user message, builds context-aware prompt,
 * calls Claude, saves assistant response, and returns the result with usage info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';
import { buildCoachingSystemPrompt } from '@/lib/ai/prompts';
import type { ConversationMessage, StudentProfileForAi, QuickAction } from '@/lib/ai/types';

const chatSchema = z.object({
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'AI coaching is available to students only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { conversationId, message, quickAction } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'student_coaching');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Verify conversation exists and is owned by user
    const conversations = await sql`
      SELECT id FROM ai_conversations
      WHERE id = ${conversationId} AND user_id = ${userId}
    `;

    if (conversations.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Step 3: Save user message
    await sql`
      INSERT INTO ai_messages (conversation_id, role, content)
      VALUES (${conversationId}, 'user', ${message})
    `;

    // Step 4: Build student profile
    const userRows = await sql`
      SELECT display_name, university, major, graduation_year, gpa, bio, metadata
      FROM users
      WHERE id = ${userId}
    `;

    const user = userRows[0] || {};
    const metadata = (user.metadata || {}) as Record<string, unknown>;

    // Step 5: Query student skills
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
      sportsPlayed: (metadata.sportsPlayed as string) || null,
      activities: (metadata.activities as string) || null,
    };

    // Step 6: Fetch last 20 messages for context
    const historyRows = await sql`
      SELECT role, content
      FROM ai_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Reverse to chronological order (oldest first)
    const conversationHistory: ConversationMessage[] = historyRows
      .reverse()
      .map((m: Record<string, unknown>) => ({
        role: m.role as ConversationMessage['role'],
        content: m.content as string,
      }));

    // Step 7: Build system prompt
    const systemPrompt = buildCoachingSystemPrompt(studentProfile);

    // Step 8: If quickAction is set, prepend a context message
    if (quickAction && quickAction in QUICK_ACTION_LABELS) {
      const label = QUICK_ACTION_LABELS[quickAction as QuickAction];
      conversationHistory.unshift({
        role: 'user',
        content: `[Context: The student is asking for help with: ${label}]`,
      });
    }

    // Step 9: Call Claude
    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: conversationHistory,
      maxTokens: 2048,
    });

    // Step 10: Save assistant response
    await sql`
      INSERT INTO ai_messages (conversation_id, role, content)
      VALUES (${conversationId}, 'assistant', ${aiResponse})
    `;

    // Step 11: Increment usage
    await incrementUsageV2(tenantId, userId, 'student_coaching');

    // Step 12: Update conversation title if first user message
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

    // Step 13: Return response with usage info
    const usage = await getUsageStatusV2(tenantId, userId, 'student_coaching');

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: aiResponse,
      },
      usage,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
