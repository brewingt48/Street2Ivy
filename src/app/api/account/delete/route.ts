/**
 * DELETE /api/account/delete
 *
 * Permanently delete the authenticated user's account and all associated data.
 * Requires password confirmation and email match for safety.
 *
 * Cascade order:
 *   1. AI messages & conversations
 *   2. Notifications
 *   3. Application messages (via sender_id)
 *   4. Direct messages, education messages, admin messages
 *   5. Project applications (anonymize if rated, delete if not)
 *   6. Portfolio (badges, projects, views, portfolio itself)
 *   7. Match scores, feedback, schedule data, recomputation queue
 *   8. AI usage counters, portfolio intelligence reports, blocked coaching
 *   9. User skills, attachments
 *  10. Sessions (force logout)
 *  11. Audit log entry BEFORE user deletion
 *  12. Delete user record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { verifyPassword } from '@/lib/auth/password';
import { sql, withTransaction } from '@/lib/db';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';
import { sendEmail } from '@/lib/email/send';
import { emailShell } from '@/lib/email/templates/shell';

export async function DELETE(request: NextRequest) {
  try {
    // 1. Require authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, email: sessionEmail } = session.data;
    const { ip, userAgent } = extractRequestInfo(request);

    // 2. Parse and validate body
    let body: { password: string; confirmEmail: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { password, confirmEmail } = body;

    if (!password || !confirmEmail) {
      return NextResponse.json(
        { error: 'Password and email confirmation are required' },
        { status: 400 }
      );
    }

    // 3. Verify email matches the authenticated user
    if (confirmEmail.toLowerCase().trim() !== sessionEmail.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Email does not match your account' },
        { status: 400 }
      );
    }

    // 4. Verify password
    const verifiedUserId = await verifyPassword(sessionEmail, password);
    if (!verifiedUserId || verifiedUserId !== userId) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 403 }
      );
    }

    // 5. Write audit log BEFORE deletion (so we have a record)
    await auditLog('USER_DELETED', {
      userId,
      email: sessionEmail,
      ip,
      userAgent,
      path: '/api/account/delete',
      details: {
        action: 'account_self_deletion',
        deletedAt: new Date().toISOString(),
      },
    });

    // 6. Perform cascade deletion in a transaction
    await withTransaction(async (tx) => {
      // --- AI data ---
      // Delete AI messages for user's conversations
      await tx`
        DELETE FROM ai_messages
        WHERE conversation_id IN (
          SELECT id FROM ai_conversations WHERE user_id = ${userId}
        )
      `;
      await tx`DELETE FROM ai_conversations WHERE user_id = ${userId}`;
      await tx`DELETE FROM ai_usage_counters_v2 WHERE user_id = ${userId}`;
      await tx`DELETE FROM portfolio_intelligence_reports WHERE student_user_id = ${userId}`;
      await tx`DELETE FROM talent_insight_reports WHERE corporate_user_id = ${userId}`;

      // --- Blocked coaching ---
      await tx`DELETE FROM blocked_coaching_students WHERE user_id = ${userId}`;

      // --- Notifications ---
      await tx`DELETE FROM notifications WHERE recipient_id = ${userId}`;

      // --- Application messages (user as sender) ---
      await tx`DELETE FROM application_messages WHERE sender_id = ${userId}`;

      // --- Direct messages, education messages, admin messages ---
      await tx`DELETE FROM direct_messages WHERE sender_id = ${userId} OR recipient_id = ${userId}`;
      await tx`DELETE FROM education_messages WHERE sender_id = ${userId} OR recipient_id = ${userId}`;
      await tx`DELETE FROM admin_messages WHERE sender_id = ${userId} OR recipient_id = ${userId}`;

      // --- Project applications ---
      // Anonymize applications that have ratings (to preserve rating integrity)
      await tx`
        UPDATE project_applications
        SET student_name = '[deleted]',
            student_email = '[deleted]',
            cover_letter = NULL,
            interest_reason = NULL,
            relevant_coursework = NULL,
            references_text = NULL,
            gpa = NULL,
            updated_at = NOW()
        WHERE student_id = ${userId}
          AND id IN (
            SELECT application_id FROM student_ratings WHERE student_id = ${userId}
            UNION
            SELECT application_id FROM corporate_ratings WHERE student_id = ${userId}
          )
      `;

      // Anonymize applications where user is the corporate partner with ratings
      await tx`
        UPDATE project_applications
        SET corporate_name = '[deleted]',
            corporate_email = '[deleted]',
            updated_at = NOW()
        WHERE corporate_id = ${userId}
          AND id IN (
            SELECT application_id FROM student_ratings WHERE student_id = ${userId}
            UNION
            SELECT application_id FROM corporate_ratings WHERE corporate_id = ${userId}
          )
      `;

      // Delete applications without ratings (student side)
      await tx`
        DELETE FROM project_applications
        WHERE student_id = ${userId}
          AND id NOT IN (
            SELECT application_id FROM student_ratings WHERE student_id = ${userId}
            UNION
            SELECT application_id FROM corporate_ratings WHERE student_id = ${userId}
          )
      `;

      // --- Portfolio ---
      // Get portfolio ID first
      const portfolios = await tx`
        SELECT id FROM student_portfolios WHERE student_id = ${userId}
      `;
      if (portfolios.length > 0) {
        const portfolioId = portfolios[0].id;
        await tx`DELETE FROM portfolio_views WHERE portfolio_id = ${portfolioId}`;
        await tx`DELETE FROM portfolio_projects WHERE portfolio_id = ${portfolioId}`;
        await tx`DELETE FROM student_portfolios WHERE id = ${portfolioId}`;
      }
      await tx`DELETE FROM portfolio_badges WHERE student_id = ${userId}`;

      // --- Match data ---
      await tx`DELETE FROM match_feedback WHERE user_id = ${userId}`;
      await tx`DELETE FROM match_feedback WHERE student_id = ${userId}`;
      // match_score_history cascades from match_scores
      await tx`DELETE FROM match_scores WHERE student_id = ${userId}`;
      await tx`DELETE FROM corporate_attractiveness_scores WHERE author_id = ${userId}`;
      await tx`DELETE FROM student_schedules WHERE user_id = ${userId}`;
      await tx`DELETE FROM recomputation_queue WHERE student_id = ${userId}`;

      // --- Skills ---
      await tx`DELETE FROM user_skills WHERE user_id = ${userId}`;

      // --- Sessions (force logout all devices) ---
      await tx`
        DELETE FROM sessions
        WHERE sess::text LIKE ${'%' + userId + '%'}
      `;

      // --- Finally delete the user record ---
      await tx`DELETE FROM users WHERE id = ${userId}`;
    });

    // 7. Send confirmation email (fire-and-forget)
    sendEmail({
      to: sessionEmail,
      subject: 'Your Proveground Account Has Been Deleted',
      html: emailShell({
        title: 'Account Deleted',
        preheader: 'Your Proveground account has been permanently deleted.',
        body: `
          <h2>Account Deleted</h2>
          <p>Your Proveground account associated with <strong>${sessionEmail}</strong> has been permanently deleted.</p>
          <p>All your personal data, including your profile, applications, messages, portfolio, and AI coaching conversations, has been removed from our systems.</p>
          <p>If you did not request this deletion, please contact us immediately at support@proveground.com.</p>
          <hr class="divider" />
          <p style="font-size: 13px; color: #64748b;">This is a confirmation email. No further action is needed.</p>
        `,
      }),
      tags: ['account-deletion'],
    }).catch(() => {
      // Don't block the response if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json(
      { error: 'Account deletion failed. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
