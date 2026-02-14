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
 */
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

  const response = NextResponse.next();

  // Resolve tenant from subdomain
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  // Set default tenant ID (from env) or resolved tenant
  const defaultTenantId = process.env.TENANT_ID || '';

  if (subdomain) {
    // Subdomain-based tenant resolution will be enhanced in Phase 1
    // For now, pass the subdomain through
    response.headers.set('x-tenant-subdomain', subdomain);
  }

  // Always set the default tenant ID for now
  response.headers.set('x-tenant-id', defaultTenantId);
  response.headers.set('x-tenant-subdomain', subdomain || 'campus2career');

  // Read session cookie for auth context
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
