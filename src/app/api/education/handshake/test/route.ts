/**
 * Handshake Connection Test API
 * POST — Test the Handshake EDU API connection
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { HandshakeApiClient } from '@/lib/handshake';

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const client = new HandshakeApiClient(session.data.tenantId!);
    const result = await client.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Handshake test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
      latencyMs: 0,
    });
  }
}
