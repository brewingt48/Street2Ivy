import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/public/tenants/search?q=<query>
 *
 * Public tenant search for the login modal autocomplete.
 * Returns minimal data (name, displayName, subdomain, logoUrl) for active tenants.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ tenants: [] });
  }

  const pattern = `%${q}%`;

  const rows = await sql`
    SELECT subdomain, name, display_name, branding
    FROM tenants
    WHERE status = 'active'
      AND (
        name ILIKE ${pattern}
        OR display_name ILIKE ${pattern}
        OR subdomain ILIKE ${pattern}
      )
    ORDER BY name ASC
    LIMIT 8
  `;

  const tenants = rows.map((r) => {
    const branding = (r.branding ?? {}) as Record<string, string>;
    return {
      subdomain: r.subdomain,
      name: r.name,
      displayName: r.display_name || r.name,
      logoUrl: branding.logoUrl || null,
    };
  });

  return NextResponse.json({ tenants });
}
