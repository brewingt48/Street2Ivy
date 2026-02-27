/**
 * Handshake Sync Service
 *
 * Syncs skill demand data and target roles from Handshake EDU API.
 */

import { sql } from '@/lib/db';
import { HandshakeApiClient } from './client';

interface SyncResult {
  skillsUpdated: number;
  rolesUpdated: number;
  jobsAnalyzed: number;
}

/**
 * Sync skill demand weights from Handshake job postings.
 *
 * 1. Fetch job qualifications from Handshake
 * 2. Extract skill keywords
 * 3. Match to existing skills (by name or aliases)
 * 4. Update demand_weight on skills table
 * 5. Update frequency_in_postings on role_skill_requirements
 * 6. Update sync status on handshake_integrations
 */
export async function syncSkillDemandFromHandshake(institutionId: string): Promise<SyncResult> {
  const client = new HandshakeApiClient(institutionId);

  let skillsUpdated = 0;
  let rolesUpdated = 0;
  let jobsAnalyzed = 0;

  try {
    // 1. Fetch job qualifications
    const qualifications = await client.fetchJobQualifications({ per_page: '100' });
    jobsAnalyzed = qualifications.length;

    // 2. Extract skill keyword frequencies
    const skillFrequency = new Map<string, number>();
    for (const qual of qualifications) {
      const keywords = extractSkillKeywords(qual);
      for (const keyword of keywords) {
        skillFrequency.set(keyword, (skillFrequency.get(keyword) || 0) + 1);
      }
    }

    // 3. Match to existing skills and update demand_weight
    const allSkillRows = await sql`SELECT id, name, aliases FROM skills`;
    const totalPostings = Math.max(jobsAnalyzed, 1);

    for (const skillRow of allSkillRows) {
      const name = (skillRow.name as string).toLowerCase();
      const aliases = (skillRow.aliases as string[] | null) || [];
      const allNames = [name, ...aliases.map((a: string) => a.toLowerCase())];

      let matchedCount = 0;
      for (const alias of allNames) {
        matchedCount += skillFrequency.get(alias) || 0;
      }

      if (matchedCount > 0) {
        const weight = Math.min(matchedCount / totalPostings, 1.0).toFixed(3);
        await sql`
          UPDATE skills SET demand_weight = ${weight}
          WHERE id = ${skillRow.id}
        `;
        skillsUpdated++;
      }
    }

    // 4. Update frequency_in_postings for role_skill_requirements
    const reqRows = await sql`
      SELECT rsr.id, s.name, s.aliases
      FROM role_skill_requirements rsr
      JOIN skills s ON s.id = rsr.skill_id
    `;

    for (const reqRow of reqRows) {
      const name = (reqRow.name as string).toLowerCase();
      const aliases = (reqRow.aliases as string[] | null) || [];
      const allNames = [name, ...aliases.map((a: string) => a.toLowerCase())];

      let matchedCount = 0;
      for (const alias of allNames) {
        matchedCount += skillFrequency.get(alias) || 0;
      }

      if (matchedCount > 0) {
        const freq = Math.min(matchedCount / totalPostings, 1.0).toFixed(3);
        await sql`
          UPDATE role_skill_requirements
          SET frequency_in_postings = ${freq}, last_synced_at = NOW()
          WHERE id = ${reqRow.id}
        `;
        rolesUpdated++;
      }
    }

    // 5. Update sync status
    await sql`
      UPDATE handshake_integrations
      SET last_sync_at = NOW(), last_sync_status = 'success', last_sync_error = NULL
      WHERE institution_id = ${institutionId}
    `;

    return { skillsUpdated, rolesUpdated, jobsAnalyzed };
  } catch (error) {
    // Record failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    await sql`
      UPDATE handshake_integrations
      SET last_sync_at = NOW(), last_sync_status = 'failed', last_sync_error = ${errorMessage}
      WHERE institution_id = ${institutionId}
    `;
    throw error;
  }
}

/**
 * Sync target roles from Handshake job postings.
 *
 * 1. Fetch jobs from Handshake
 * 2. Extract unique job titles
 * 3. Create/update target_roles with source = 'handshake_api'
 * 4. Map qualifications to role_skill_requirements
 */
export async function syncTargetRolesFromHandshake(institutionId: string): Promise<{ rolesCreated: number; rolesUpdated: number }> {
  const client = new HandshakeApiClient(institutionId);

  let rolesCreated = 0;
  let rolesUpdated = 0;

  // Fetch jobs
  const jobs = await client.fetchJobs({ per_page: '100' });

  // Group by normalized title
  const titleGroups = new Map<string, Array<Record<string, unknown>>>();
  for (const job of jobs) {
    const title = normalizeJobTitle(job.title as string || 'Unknown');
    const existing = titleGroups.get(title);
    if (existing) {
      existing.push(job);
    } else {
      titleGroups.set(title, [job]);
    }
  }

  // Fetch existing handshake-sourced roles for this institution
  const existingRoles = await sql`
    SELECT id, title FROM target_roles
    WHERE institution_id = ${institutionId} AND source = 'handshake_api'
  `;
  const existingTitleMap = new Map<string, string>();
  for (const r of existingRoles) {
    existingTitleMap.set((r.title as string).toLowerCase(), r.id as string);
  }

  for (const [title, jobGroup] of Array.from(titleGroups.entries())) {
    const existingId = existingTitleMap.get(title.toLowerCase());

    let roleId: string;
    if (existingId) {
      roleId = existingId;
      await sql`
        UPDATE target_roles SET updated_at = NOW() WHERE id = ${roleId}
      `;
      rolesUpdated++;
    } else {
      const rows = await sql`
        INSERT INTO target_roles (title, description, institution_id, source, source_reference_id)
        VALUES (${title}, ${'Auto-imported from Handshake job postings'}, ${institutionId}, 'handshake_api', ${''})
        RETURNING id
      `;
      roleId = rows[0].id as string;
      rolesCreated++;
    }

    // Extract qualifications as skill requirements
    const qualKeywords = new Set<string>();
    for (const job of jobGroup) {
      const keywords = extractSkillKeywords(job);
      for (const kw of keywords) qualKeywords.add(kw);
    }

    // Match to existing skills and insert requirements
    for (const keyword of Array.from(qualKeywords)) {
      const skillRows = await sql`
        SELECT id FROM skills
        WHERE LOWER(name) = ${keyword.toLowerCase()}
        LIMIT 1
      `;
      if (skillRows.length > 0) {
        await sql`
          INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
          VALUES (${roleId}, ${skillRows[0].id}, 'preferred', 2, 'handshake_api')
          ON CONFLICT DO NOTHING
        `;
      }
    }
  }

  return { rolesCreated, rolesUpdated };
}

/**
 * Extract skill keywords from a job/qualification record.
 */
function extractSkillKeywords(record: Record<string, unknown>): string[] {
  const keywords: string[] = [];

  // Common fields that may contain skill info
  const textFields = ['title', 'description', 'qualifications', 'skills', 'requirements'];
  for (const field of textFields) {
    const value = record[field];
    if (typeof value === 'string') {
      // Split on common delimiters and clean up
      const parts = value.split(/[,;|•\n]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 1 && s.length < 50);
      keywords.push(...parts);
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          keywords.push(item.trim().toLowerCase());
        }
      }
    }
  }

  return keywords;
}

/**
 * Normalize a job title to a standard form.
 */
function normalizeJobTitle(title: string): string {
  return title
    .replace(/\s+(intern|internship|co-op|coop|fellow|fellowship)/gi, '')
    .replace(/\s+(I|II|III|IV|V|1|2|3|Jr\.?|Sr\.?|Junior|Senior|Lead|Principal|Staff)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
