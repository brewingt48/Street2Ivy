const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS issue_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reporter_name TEXT NOT NULL,
      reported_entity_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_entity_name TEXT NOT NULL,
      application_id UUID REFERENCES project_applications(id) ON DELETE SET NULL,
      category TEXT NOT NULL CHECK (category IN ('safety', 'harassment', 'payment', 'communication', 'discrimination', 'other')),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
      resolution_notes TEXT,
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      institution_domain TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_issue_reports_tenant ON issue_reports(tenant_id)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(tenant_id, status)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_issue_reports_reporter ON issue_reports(reporter_id)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_issue_reports_entity ON issue_reports(reported_entity_id)`);

  console.log('issue_reports table created successfully');
  await sql.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
