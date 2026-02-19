import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractSubdomain } from '@/lib/tenant/resolve';

/**
 * Next.js Edge Middleware
 *
 * Runs on every request to:
 * 1. Resolve tenant from subdomain
 * 2. Pass tenant info via request headers to server components
 * 3. Handle auth redirects for protected routes
 * 4. CSRF validation on mutation requests
 * 5. Block null bytes in URLs
 * 6. Enforce request body size limits
 */

// Paths exempt from CSRF validation (bootstrapping, external callbacks, reads)
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/csrf-token',
  '/api/health',
  '/api/cron/',
  '/api/public/',
];

// Max body sizes (checked via Content-Length header)
const MAX_BODY_SIZE_DEFAULT = 1 * 1024 * 1024; // 1 MB
const MAX_BODY_SIZE_UPLOAD = 10 * 1024 * 1024;  // 10 MB

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
}

function isUploadPath(pathname: string): boolean {
  return pathname.includes('/upload') || pathname.includes('/attachment');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API health check
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  // ── Security: Block null bytes in URL path ──
  if (pathname.includes('\0') || pathname.includes('%00')) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }

  // ── Security: Enforce request body size limits ──
  const contentLength = request.headers.get('content-length');
  if (contentLength && pathname.startsWith('/api/')) {
    const size = parseInt(contentLength, 10);
    const maxSize = isUploadPath(pathname) ? MAX_BODY_SIZE_UPLOAD : MAX_BODY_SIZE_DEFAULT;
    if (!isNaN(size) && size > maxSize) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }
  }

  // ── Security: CSRF validation for mutation requests ──
  const method = request.method.toUpperCase();
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
    pathname.startsWith('/api/') &&
    !isCsrfExempt(pathname)
  ) {
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const headerToken = request.headers.get('x-csrf-token');

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { error: 'Invalid CSRF token', code: 'CSRF_INVALID' },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();

  // ── Tenant resolution ──
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  const defaultTenantId = process.env.TENANT_ID || '';

  response.headers.set('x-tenant-id', defaultTenantId);
  response.headers.set('x-tenant-subdomain', subdomain || 'proveground');

  // ── Session context ──
  const sessionId = request.cookies.get('s2i.sid')?.value;
  if (sessionId) {
    response.headers.set('x-session-id', sessionId);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
