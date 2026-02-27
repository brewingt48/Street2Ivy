/**
 * GET /api/csrf-token
 *
 * Generate and return a CSRF token.
 * Sets the token as a cookie and returns it in the response body.
 * Client must include this token in the X-CSRF-Token header on mutations.
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/security/csrf';

export async function GET() {
  try {
    const token = generateCsrfToken();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
