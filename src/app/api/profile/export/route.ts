/**
 * GET /api/profile/export
 *
 * Data portability endpoint — exports all user data as a JSON download.
 * Covers: profile, applications, ratings, messages, portfolio, AI conversations.
 *
 * Requires authentication. Creates an audit log entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function GET(request: NextRequest) {
  try {
    // 1. Require authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, email } = session.data;
    const { ip, userAgent } = extractRequestInfo(request);

    // 2. Audit the export request
    await auditLog('EXPORT_REQUESTED', {
      userId,
      email,
      ip,
      userAgent,
      path: '/api/profile/export',
      details: { type: 'full_data_export' },
    });

    // 3. Gather all user data in parallel
    const [
      profileRows,
      skillRows,
      applicationRows,
      studentRatingRows,
      corporateRatingRows,
      directMessageRows,
      applicationMessageRows,
      educationMessageRows,
      portfolioRows,
      portfolioProjectRows,
      portfolioBadgeRows,
      conversationRows,
      aiMessageRows,
      notificationRows,
      matchScoreRows,
      matchFeedbackRows,
    ] = await Promise.all([
      // Profile
      sql`
        SELECT id, email, role, first_name, last_name, display_name,
               bio, phone, university, major, graduation_year, gpa,
               avatar_url, email_verified, company_name, job_title,
               department, company_description, company_website,
               company_size, company_industry, stock_symbol,
               is_publicly_traded, sports_played, activities,
               created_at, updated_at
        FROM users
        WHERE id = ${userId}
      `,

      // Skills
      sql`
        SELECT s.name, s.category, us.proficiency_level, us.verification_source,
               us.verified_at, us.evidence_notes, us.created_at
        FROM user_skills us
        JOIN skills s ON s.id = us.skill_id
        WHERE us.user_id = ${userId}
      `,

      // Applications
      sql`
        SELECT id, listing_id, listing_title, corporate_name, cover_letter,
               availability_date, interest_reason, skills, relevant_coursework,
               gpa, hours_per_week, references_text, initiated_by,
               invitation_message, status, submitted_at, responded_at,
               completed_at
        FROM project_applications
        WHERE student_id = ${userId} OR corporate_id = ${userId}
      `,

      // Student ratings (ratings received as a student)
      sql`
        SELECT id, application_id, corporate_id, listing_id, project_title,
               rating, review_text, strengths, areas_for_improvement,
               recommend_for_future, created_at
        FROM student_ratings
        WHERE student_id = ${userId}
      `,

      // Corporate ratings (ratings given to corporates)
      sql`
        SELECT id, application_id, corporate_id, listing_id, project_title,
               rating, review_text, created_at
        FROM corporate_ratings
        WHERE student_id = ${userId}
      `,

      // Direct messages
      sql`
        SELECT id, thread_id, sender_id, recipient_id, subject, content,
               read_at, created_at
        FROM direct_messages
        WHERE sender_id = ${userId} OR recipient_id = ${userId}
        ORDER BY created_at DESC
      `,

      // Application messages
      sql`
        SELECT am.id, am.application_id, am.sender_id, am.sender_name,
               am.sender_role, am.content, am.message_type, am.read_at,
               am.created_at
        FROM application_messages am
        WHERE am.sender_id = ${userId}
        ORDER BY am.created_at DESC
      `,

      // Education messages
      sql`
        SELECT id, sender_id, recipient_id, subject, content,
               sent_at, received_at, is_read
        FROM education_messages
        WHERE sender_id = ${userId} OR recipient_id = ${userId}
        ORDER BY sent_at DESC
      `,

      // Portfolio
      sql`
        SELECT id, slug, display_name, headline, bio, avatar_url,
               theme, is_public, show_readiness_score, show_skill_chart,
               custom_url, view_count, created_at, updated_at
        FROM student_portfolios
        WHERE student_id = ${userId}
      `,

      // Portfolio projects
      sql`
        SELECT pp.id, pp.project_id, pp.display_order, pp.is_featured,
               pp.student_reflection, pp.created_at
        FROM portfolio_projects pp
        JOIN student_portfolios sp ON sp.id = pp.portfolio_id
        WHERE sp.student_id = ${userId}
      `,

      // Portfolio badges
      sql`
        SELECT id, badge_type, badge_label, badge_metadata, earned_at
        FROM portfolio_badges
        WHERE student_id = ${userId}
      `,

      // AI conversations
      sql`
        SELECT id, title, context_type, metadata, created_at, updated_at
        FROM ai_conversations
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `,

      // AI messages
      sql`
        SELECT am.id, am.conversation_id, am.role, am.content,
               am.metadata, am.created_at
        FROM ai_messages am
        JOIN ai_conversations ac ON ac.id = am.conversation_id
        WHERE ac.user_id = ${userId}
        ORDER BY am.created_at ASC
      `,

      // Notifications
      sql`
        SELECT id, type, subject, content, data, is_read, read_at, created_at
        FROM notifications
        WHERE recipient_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 500
      `,

      // Match scores
      sql`
        SELECT id, listing_id, composite_score, signal_breakdown,
               computed_at, version
        FROM match_scores
        WHERE student_id = ${userId}
      `,

      // Match feedback
      sql`
        SELECT id, listing_id, feedback_type, rating, comment, created_at
        FROM match_feedback
        WHERE user_id = ${userId}
      `,
    ]);

    // 4. Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      platform: 'Proveground',
      user: profileRows[0] || null,
      skills: skillRows,
      applications: applicationRows,
      ratings: {
        received: studentRatingRows,
        given: corporateRatingRows,
      },
      messages: {
        direct: directMessageRows,
        application: applicationMessageRows,
        education: educationMessageRows,
      },
      portfolio: {
        profile: portfolioRows[0] || null,
        projects: portfolioProjectRows,
        badges: portfolioBadgeRows,
      },
      aiConversations: conversationRows.map((conv) => ({
        ...conv,
        messages: aiMessageRows.filter(
          (msg) => msg.conversation_id === conv.id
        ),
      })),
      notifications: notificationRows,
      matching: {
        scores: matchScoreRows,
        feedback: matchFeedbackRows,
      },
    };

    // 5. Return as downloadable JSON
    const filename = `proveground-data-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Data export failed:', error);
    return NextResponse.json(
      { error: 'Data export failed. Please try again.' },
      { status: 500 }
    );
  }
}
