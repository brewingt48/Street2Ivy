/**
 * Sync content data from dev database to target databases.
 *
 * Copies: landing_content, tenant_content, tenants (branding),
 * institutions, and all tenant-specific data.
 *
 * Usage:
 *   DEV_DB=<url> TARGET_DB=<url> node scripts/sync-content.mjs
 */

import postgres from 'postgres';

const DEV_DB = process.env.DEV_DB;
const TARGET_DB = process.env.TARGET_DB;

if (!DEV_DB || !TARGET_DB) {
  console.error('Usage: DEV_DB=<url> TARGET_DB=<url> node scripts/sync-content.mjs');
  process.exit(1);
}

const dev = postgres(DEV_DB, { ssl: { rejectUnauthorized: false }, max: 1 });
const target = postgres(TARGET_DB, { ssl: { rejectUnauthorized: false }, max: 1 });

async function main() {
  console.log('🔄 Syncing content from dev to target...\n');

  // 1. Sync institutions
  console.log('=== Institutions ===');
  const institutions = await dev`SELECT * FROM institutions`;
  console.log(`  Found ${institutions.length} institutions in dev`);
  for (const inst of institutions) {
    await target`
      INSERT INTO institutions (domain, name, membership_status, membership_start_date, membership_end_date, ai_coaching_enabled, ai_coaching_url, created_at, updated_at)
      VALUES (${inst.domain}, ${inst.name}, ${inst.membership_status}, ${inst.membership_start_date}, ${inst.membership_end_date}, ${inst.ai_coaching_enabled}, ${inst.ai_coaching_url}, ${inst.created_at}, ${inst.updated_at})
      ON CONFLICT (domain) DO UPDATE SET
        name = EXCLUDED.name,
        membership_status = EXCLUDED.membership_status,
        membership_start_date = EXCLUDED.membership_start_date,
        membership_end_date = EXCLUDED.membership_end_date,
        ai_coaching_enabled = EXCLUDED.ai_coaching_enabled,
        ai_coaching_url = EXCLUDED.ai_coaching_url,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`  ✅ Synced ${institutions.length} institutions`);

  // 2. Sync tenants (delete existing then re-insert to match dev UUIDs)
  console.log('\n=== Tenants ===');
  const tenants = await dev`SELECT * FROM tenants`;
  console.log(`  Found ${tenants.length} tenants in dev`);
  // Clear existing tenants that might have different UUIDs from seed data
  for (const t of tenants) {
    // Delete any existing tenant with the same subdomain but different ID
    await target`DELETE FROM tenants WHERE subdomain = ${t.subdomain} AND id != ${t.id}`;
    await target`
      INSERT INTO tenants (
        id, subdomain, name, display_name, status,
        sharetribe_config, branding, institution_domain, corporate_partner_ids, features,
        marketplace_type, sport, team_name, conference, mascot_url,
        hero_video_url, hero_video_poster_url, hero_headline, hero_subheadline,
        gallery_images, social_links, about_content, contact_info,
        shared_network_enabled, network_tier,
        max_network_applications_per_month, network_partner_limit,
        created_at, updated_at
      )
      VALUES (
        ${t.id}, ${t.subdomain}, ${t.name}, ${t.display_name}, ${t.status},
        ${target.json(t.sharetribe_config || {})}, ${target.json(t.branding || {})}, ${t.institution_domain}, ${target.json(t.corporate_partner_ids || [])}, ${target.json(t.features || {})},
        ${t.marketplace_type}, ${t.sport}, ${t.team_name}, ${t.conference}, ${t.mascot_url},
        ${t.hero_video_url}, ${t.hero_video_poster_url}, ${t.hero_headline}, ${t.hero_subheadline},
        ${target.json(t.gallery_images || [])}, ${target.json(t.social_links || {})}, ${t.about_content}, ${target.json(t.contact_info || {})},
        ${t.shared_network_enabled}, ${t.network_tier},
        ${t.max_network_applications_per_month}, ${t.network_partner_limit},
        ${t.created_at}, ${t.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        subdomain = EXCLUDED.subdomain,
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        status = EXCLUDED.status,
        sharetribe_config = EXCLUDED.sharetribe_config,
        branding = EXCLUDED.branding,
        institution_domain = EXCLUDED.institution_domain,
        corporate_partner_ids = EXCLUDED.corporate_partner_ids,
        features = EXCLUDED.features,
        marketplace_type = EXCLUDED.marketplace_type,
        sport = EXCLUDED.sport,
        team_name = EXCLUDED.team_name,
        conference = EXCLUDED.conference,
        mascot_url = EXCLUDED.mascot_url,
        hero_video_url = EXCLUDED.hero_video_url,
        hero_video_poster_url = EXCLUDED.hero_video_poster_url,
        hero_headline = EXCLUDED.hero_headline,
        hero_subheadline = EXCLUDED.hero_subheadline,
        gallery_images = EXCLUDED.gallery_images,
        social_links = EXCLUDED.social_links,
        about_content = EXCLUDED.about_content,
        contact_info = EXCLUDED.contact_info,
        shared_network_enabled = EXCLUDED.shared_network_enabled,
        network_tier = EXCLUDED.network_tier,
        max_network_applications_per_month = EXCLUDED.max_network_applications_per_month,
        network_partner_limit = EXCLUDED.network_partner_limit,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`  ✅ Synced ${tenants.length} tenants`);

  // 3. Sync landing_content
  console.log('\n=== Landing Content ===');
  const landingContent = await dev`SELECT * FROM landing_content`;
  console.log(`  Found ${landingContent.length} sections in dev`);
  for (const lc of landingContent) {
    await target`
      INSERT INTO landing_content (section, content, updated_at, updated_by)
      VALUES (${lc.section}, ${target.json(lc.content)}, ${lc.updated_at}, ${lc.updated_by})
      ON CONFLICT (section) DO UPDATE SET
        content = EXCLUDED.content,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  }
  console.log(`  ✅ Synced ${landingContent.length} landing content sections`);

  // 4. Sync tenant_content
  console.log('\n=== Tenant Content ===');
  const tenantContent = await dev`SELECT * FROM tenant_content`;
  console.log(`  Found ${tenantContent.length} tenant content entries in dev`);
  for (const tc of tenantContent) {
    await target`
      INSERT INTO tenant_content (domain, content, updated_at, updated_by)
      VALUES (${tc.domain}, ${target.json(tc.content)}, ${tc.updated_at}, ${tc.updated_by})
      ON CONFLICT (domain) DO UPDATE SET
        content = EXCLUDED.content,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  }
  console.log(`  ✅ Synced ${tenantContent.length} tenant content entries`);

  // 5. Sync coaching_config
  console.log('\n=== Coaching Config ===');
  const coachingConfig = await dev`SELECT * FROM coaching_config`;
  console.log(`  Found ${coachingConfig.length} coaching config entries in dev`);
  for (const cc of coachingConfig) {
    await target`
      INSERT INTO coaching_config (key, value, updated_at)
      VALUES (${cc.key}, ${cc.value}, ${cc.updated_at})
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`  ✅ Synced ${coachingConfig.length} coaching config entries`);

  // 6. Sync blog_settings
  console.log('\n=== Blog Settings ===');
  const blogSettings = await dev`SELECT * FROM blog_settings`;
  console.log(`  Found ${blogSettings.length} blog settings in dev`);
  for (const bs of blogSettings) {
    await target`
      INSERT INTO blog_settings (key, value)
      VALUES (${bs.key}, ${bs.value})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  }
  console.log(`  ✅ Synced ${blogSettings.length} blog settings`);

  // 7. Sync huddle_branding
  console.log('\n=== Huddle Branding ===');
  try {
    const huddleBranding = await dev`SELECT * FROM huddle_branding`;
    console.log(`  Found ${huddleBranding.length} huddle branding entries in dev`);
    for (const hb of huddleBranding) {
      await target`
        INSERT INTO huddle_branding (id, tenant_id, primary_color, secondary_color, accent_color, logo_url, banner_url, custom_css, created_at, updated_at)
        VALUES (${hb.id}, ${hb.tenant_id}, ${hb.primary_color}, ${hb.secondary_color}, ${hb.accent_color}, ${hb.logo_url}, ${hb.banner_url}, ${hb.custom_css}, ${hb.created_at}, ${hb.updated_at})
        ON CONFLICT (id) DO UPDATE SET
          primary_color = EXCLUDED.primary_color,
          secondary_color = EXCLUDED.secondary_color,
          accent_color = EXCLUDED.accent_color,
          logo_url = EXCLUDED.logo_url,
          banner_url = EXCLUDED.banner_url,
          custom_css = EXCLUDED.custom_css,
          updated_at = EXCLUDED.updated_at
      `;
    }
    console.log(`  ✅ Synced ${huddleBranding.length} huddle branding entries`);
  } catch (err) {
    console.log(`  ⚠️ Huddle branding sync skipped: ${err.message}`);
  }

  // 8. Sync legal_policies
  console.log('\n=== Legal Policies ===');
  try {
    const legalPolicies = await dev`SELECT * FROM legal_policies`;
    console.log(`  Found ${legalPolicies.length} legal policies in dev`);
    for (const lp of legalPolicies) {
      // Delete any existing policy with the same slug but different ID
      await target`DELETE FROM legal_policies WHERE slug = ${lp.slug} AND id != ${lp.id}`;
      await target`
        INSERT INTO legal_policies (id, title, slug, content, is_published, sort_order, tenant_id, created_by, updated_by, created_at, updated_at)
        VALUES (${lp.id}, ${lp.title}, ${lp.slug}, ${lp.content}, ${lp.is_published}, ${lp.sort_order}, ${lp.tenant_id}, ${lp.created_by}, ${lp.updated_by}, ${lp.created_at}, ${lp.updated_at})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          content = EXCLUDED.content,
          is_published = EXCLUDED.is_published,
          sort_order = EXCLUDED.sort_order,
          tenant_id = EXCLUDED.tenant_id,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
      `;
    }
    console.log(`  ✅ Synced ${legalPolicies.length} legal policies`);
  } catch (err) {
    console.log(`  ⚠️ Legal policies sync skipped: ${err.message}`);
  }

  console.log('\n✅ Content sync complete!');
  await dev.end();
  await target.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n💥 Sync failed:', err.message);
  await dev.end();
  await target.end();
  process.exit(1);
});
