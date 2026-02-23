/**
 * FERPA Consent Gate
 *
 * Utility functions for checking and enforcing FERPA consent before
 * sharing student educational records with third parties.
 *
 * FERPA (Family Educational Rights and Privacy Act) requires explicit
 * consent before disclosing personally identifiable information from
 * student education records.
 */

import { sql } from '@/lib/db';

/**
 * Consent text for each consent type (versioned for legal defensibility).
 * The exact text agreed to is stored in the database alongside each consent record.
 */
export const FERPA_CONSENT_TEXTS: Record<string, string> = {
  data_sharing:
    'I consent to having my academic and professional development records shared with corporate partners who post project listings on this platform. This includes profile information I have chosen to make visible through my directory information preferences. I understand that I may revoke this consent at any time through my account settings, and that revocation will apply to future disclosures only.',
  ai_processing:
    'I consent to AI-powered analysis of my profile for matching and coaching purposes. This includes the use of my academic records, skills, project history, and profile information by AI systems (powered by Anthropic\'s Claude) to provide personalized career coaching, match scoring, skills gap analysis, and professional development recommendations. I understand that Anthropic processes this data under a data processing agreement and does not use my data to train their models.',
  directory_info:
    'I consent to displaying my directory information (name, major, year, sport, and other fields I have selected in my directory preferences) to corporate partners on this platform. I understand that I can control exactly which fields are visible through my directory information preferences, and I can revoke this consent at any time.',
  annual_notification:
    'I acknowledge that I have been notified of my rights under the Family Educational Rights and Privacy Act (FERPA), including: (1) the right to inspect and review my education records; (2) the right to request amendment of records I believe to be inaccurate or misleading; (3) the right to consent to disclosure of personally identifiable information from my education records; and (4) the right to file a complaint with the U.S. Department of Education concerning alleged failures to comply with FERPA.',
};

/**
 * Check if a student has granted data sharing consent.
 * Returns true if the most recent consent record for data_sharing is granted.
 */
export async function checkDataSharingConsent(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT is_granted
    FROM ferpa_consents
    WHERE user_id = ${userId}
      AND consent_type = 'data_sharing'
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return result.length > 0 && result[0].is_granted === true;
}

/**
 * Check if a student has granted AI processing consent.
 * Returns true if the most recent consent record for ai_processing is granted.
 */
export async function checkAIProcessingConsent(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT is_granted
    FROM ferpa_consents
    WHERE user_id = ${userId}
      AND consent_type = 'ai_processing'
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return result.length > 0 && result[0].is_granted === true;
}

/**
 * Check if a student has completed the initial FERPA consent flow.
 * Returns true if the student has any consent records (granted or not).
 */
export async function hasFERPAConsentOnFile(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM ferpa_consents
    WHERE user_id = ${userId}
  `;

  return parseInt(result[0]?.count as string) > 0;
}

/**
 * Require FERPA consent of a specific type. Throws an error if consent
 * has not been granted.
 */
export async function requireFERPAConsent(
  userId: string,
  consentType: string
): Promise<void> {
  const result = await sql`
    SELECT is_granted
    FROM ferpa_consents
    WHERE user_id = ${userId}
      AND consent_type = ${consentType}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (result.length === 0 || result[0].is_granted !== true) {
    throw new Error(`FERPA consent required: ${consentType}`);
  }
}

/**
 * Directory preference field mapping: maps database column names to
 * the corresponding student data field names used in API responses.
 */
const DIRECTORY_FIELD_MAP: Record<string, string[]> = {
  show_full_name: ['firstName', 'lastName', 'displayName', 'student_first_name', 'student_last_name'],
  show_email: ['email', 'student_email'],
  show_phone: ['phone'],
  show_major: ['major'],
  show_year: ['graduationYear', 'graduation_year', 'year'],
  show_sport: ['sportsPlayed', 'sports_played', 'sport'],
  show_gpa: ['gpa', 'student_gpa'],
  show_university: ['university'],
  show_bio: ['bio'],
  show_skills: ['skills'],
  show_portfolio: ['portfolio', 'portfolioUrl', 'portfolio_url'],
};

interface DirectoryPreferences {
  show_full_name: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_major: boolean;
  show_year: boolean;
  show_sport: boolean;
  show_gpa: boolean;
  show_university: boolean;
  show_bio: boolean;
  show_skills: boolean;
  show_portfolio: boolean;
}

/**
 * Get directory preferences for a student. Returns defaults if none are set.
 */
async function getDirectoryPreferences(userId: string): Promise<DirectoryPreferences> {
  const result = await sql`
    SELECT
      show_full_name, show_email, show_phone, show_major,
      show_year, show_sport, show_gpa, show_university,
      show_bio, show_skills, show_portfolio
    FROM directory_info_preferences
    WHERE user_id = ${userId}
  `;

  if (result.length === 0) {
    // Return defaults
    return {
      show_full_name: true,
      show_email: false,
      show_phone: false,
      show_major: true,
      show_year: true,
      show_sport: true,
      show_gpa: false,
      show_university: true,
      show_bio: true,
      show_skills: true,
      show_portfolio: true,
    };
  }

  return result[0] as DirectoryPreferences;
}

/**
 * Filter student data by directory preferences before sharing with
 * corporate partners. Strips non-consented fields from the data object.
 *
 * This function:
 * 1. Checks if the student has granted data_sharing consent
 * 2. Loads the student's directory preferences
 * 3. Removes any fields the student has not consented to share
 *
 * @param userId - The student's user ID
 * @param data - The student data object to filter
 * @returns Filtered data object with only consented fields
 */
export async function filterByDirectoryPreferences(
  userId: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // If no data sharing consent, return minimal data
  const hasConsent = await checkDataSharingConsent(userId);
  if (!hasConsent) {
    // Without data sharing consent, only return the student ID
    return { id: data.id };
  }

  const prefs = await getDirectoryPreferences(userId);
  const filtered = { ...data };

  // For each preference, if not granted, remove the corresponding fields
  for (const [prefKey, fieldNames] of Object.entries(DIRECTORY_FIELD_MAP)) {
    const isAllowed = prefs[prefKey as keyof DirectoryPreferences];
    if (!isAllowed) {
      for (const field of fieldNames) {
        delete filtered[field];
      }
    }
  }

  return filtered;
}
