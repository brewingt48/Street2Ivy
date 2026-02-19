import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export default async function TenantLegalPolicyPage({
  params,
}: {
  params: Promise<{ subdomain: string; slug: string }>;
}) {
  const { subdomain, slug } = await params;

  // Get tenant
  const tenantRows = await sql`
    SELECT id, name, display_name, subdomain, branding
    FROM tenants
    WHERE subdomain = ${subdomain} AND status = 'active'
  `;

  if (tenantRows.length === 0) return notFound();
  const tenant = tenantRows[0];
  const branding = (tenant.branding ?? {}) as Record<string, string>;
  const primary = branding.primaryColor ?? '#0f766e';
  const displayName = (tenant.display_name ?? tenant.name) as string;

  // Try tenant policy first, then fall back to platform policy
  let policy = null;

  const tenantPolicies = await sql`
    SELECT title, content, updated_at
    FROM legal_policies
    WHERE slug = ${slug} AND tenant_id = ${tenant.id} AND is_published = true
  `;

  if (tenantPolicies.length > 0) {
    policy = tenantPolicies[0];
  } else {
    const platformPolicies = await sql`
      SELECT title, content, updated_at
      FROM legal_policies
      WHERE slug = ${slug} AND tenant_id IS NULL AND is_published = true
    `;
    if (platformPolicies.length > 0) {
      policy = platformPolicies[0];
    }
  }

  if (!policy) return notFound();

  const updatedAt = policy.updated_at
    ? new Date(policy.updated_at as string).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header bar */}
      <header
        className="px-6 py-4"
        style={{ backgroundColor: primary }}
      >
        <div className="max-w-3xl mx-auto">
          <a
            href={`/${subdomain}`}
            className="text-white font-bold text-lg hover:opacity-90 transition-opacity"
          >
            {displayName}
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="text-4xl font-bold text-gray-900">{policy.title as string}</h1>
        {updatedAt && (
          <p className="text-sm text-gray-400 mt-2">Last updated: {updatedAt}</p>
        )}
        <div className="mt-8 prose prose-slate max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
          {policy.content as string}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} {displayName}. Powered by{' '}
          <a href="/" className="text-white hover:underline">Proveground</a>
        </p>
      </footer>
    </div>
  );
}
