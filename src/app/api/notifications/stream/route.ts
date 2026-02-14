/**
 * GET /api/notifications/stream — SSE endpoint for real-time notifications
 *
 * Polls the database every 10 seconds for new unread notifications.
 * Single-dyno friendly (no Redis/pub-sub needed).
 */

import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.data.userId;
  let lastCheck = new Date().toISOString();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(': heartbeat\n\n'));

      const interval = setInterval(async () => {
        try {
          // Check for new notifications since last check
          const newNotifs = await sql`
            SELECT id, type, subject, content, data, created_at
            FROM notifications
            WHERE recipient_id = ${userId}
              AND is_read = false
              AND created_at > ${lastCheck}::timestamptz
            ORDER BY created_at ASC
            LIMIT 10
          `;

          if (newNotifs.length > 0) {
            lastCheck = new Date().toISOString();
            for (const n of newNotifs) {
              const event = {
                id: n.id,
                type: n.type,
                subject: n.subject,
                content: n.content,
                data: n.data,
                createdAt: n.created_at,
              };
              controller.enqueue(
                encoder.encode(`event: notification\ndata: ${JSON.stringify(event)}\n\n`)
              );
            }
          }

          // Also send unread count periodically
          const unread = await sql`
            SELECT COUNT(*) as count FROM notifications
            WHERE recipient_id = ${userId} AND is_read = false
          `;
          controller.enqueue(
            encoder.encode(`event: unread-count\ndata: ${JSON.stringify({ count: parseInt(unread[0].count as string) })}\n\n`)
          );

          // Heartbeat
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // If DB error, send heartbeat anyway to keep connection alive
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        }
      }, 10000); // Poll every 10 seconds

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
