/**
 * AI Service Type Definitions
 *
 * Shared interfaces for the tiered AI coaching system.
 */

/** AI tier configuration for a plan level */
export interface AiTierConfig {
  model: string;
  maxMonthlyUses: number; // -1 = unlimited
  features: AiFeature[];
}

/** Available AI features */
export type AiFeature =
  | 'coaching'
  | 'match_insights'
  | 'diff_view'
  | 'project_scoping'
  | 'portfolio_intelligence'
  | 'talent_insights';

/** Result of an AI access check */
export interface AiAccessCheck {
  allowed: boolean;
  remaining: number; // -1 = unlimited
  model: string;
  reason?: string;
}

/** Current usage status for a tenant */
export interface AiUsageStatus {
  used: number;
  limit: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
  resetDate: string; // ISO date of next month start
  plan: string;
  model: string;
}

/** A message in an AI conversation */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Quick action types for coaching */
export type QuickAction =
  | 'resume_review'
  | 'interview_prep'
  | 'cover_letter'
  | 'career_advice'
  | 'skill_gap'
  | 'general';

/** Options for the Claude client */
export interface ClaudeOptions {
  model: string;
  systemPrompt: string;
  messages: ConversationMessage[];
  maxTokens?: number;
}

/** Student profile data for prompt building */
export interface StudentProfileForAi {
  name: string;
  university: string | null;
  major: string | null;
  graduationYear: string | null;
  gpa: string | null;
  bio: string | null;
  skills: string[];
  sportsPlayed: string | null;
  activities: string | null;
}

/** Match data for AI insights */
export interface MatchDataForAi {
  listingTitle: string;
  listingDescription: string;
  requiredSkills: string[];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}
