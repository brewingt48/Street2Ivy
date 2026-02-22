import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/home/Navbar';
import { Footer } from '@/components/home/Footer';

export const revalidate = 60;

export default async function PlatformLegalPolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await sql`
    SELECT title, slug, content, updated_at
    FROM legal_policies
    WHERE slug = ${slug} AND tenant_id IS NULL AND is_published = true
  `;

  if (rows.length === 0) return notFound();

  const policy = rows[0];
  const updatedAt = policy.updated_at
    ? new Date(policy.updated_at as string).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="text-4xl font-bold text-[#1a1a2e]">{policy.title as string}</h1>
        {updatedAt && (
          <p className="text-sm text-slate-400 mt-2">Last updated: {updatedAt}</p>
        )}
        <div className="mt-8 prose prose-slate max-w-none whitespace-pre-wrap text-[#3a3a3a] leading-relaxed">
          {policy.content as string}
        </div>
      </div>
      <Footer />
    </main>
  );
}
