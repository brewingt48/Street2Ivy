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

// ---------------------------------------------------------------------------
// Enhanced AI Feature Gate Types (v2)
// ---------------------------------------------------------------------------

/** Comprehensive AI config resolved from subscription tier + overrides */
export interface TenantAiConfig {
  enabled: boolean;
  model: string;
  modelDisplayName: string;
  maxTokens: number;
  streaming: boolean;
  studentCoaching: {
    enabled: boolean;
    interactionsPerStudentPerMonth: number; // -1 = unlimited
    quickActionsOnly: boolean;
    allowedQuickActions: string[];
    matchScoreCard: boolean;
    diffView: boolean;
    conversationMemory: boolean;
    confidenceMeter: boolean;
    maxTurnsPerSession: number;
  };
  projectScoping: {
    enabled: boolean;
    interactionsPerUserPerMonth: number;
    allowedFeatures: string[];
    milestoneGeneration: boolean;
    skillsSuggestions: boolean;
    fullScopingWizard: boolean;
    maxTurnsPerSession: number;
  };
  portfolioIntelligence: {
    enabled: boolean;
    refreshFrequency?: string;
    includeCareerNarrative?: boolean;
    includeSkillProgression?: boolean;
    includeStrengthsSummary?: boolean;
  };
  talentInsights: {
    enabled: boolean;
    postProjectAssessment?: boolean;
    standoutContributors?: boolean;
    teamPerformanceSummary?: boolean;
    includeHiringRecommendation?: boolean;
  };
  institutionalAnalytics: {
    enabled: boolean;
    reportFrequency?: string;
    skillGapAnalysis?: boolean;
    engagementPatterns?: boolean;
    curriculumRecommendations?: boolean;
    benchmarkAgainstPlatform?: boolean;
  };
  rateLimits: {
    perUserPerHour: number;
    perTenantPerHour: number;
  };
}

/** Enhanced access check result with denial details */
export interface AiAccessResult {
  allowed: boolean;
  config: TenantAiConfig;
  denial?: {
    reason:
      | 'feature_disabled'
      | 'action_not_available'
      | 'monthly_limit_reached'
      | 'rate_limited'
      | 'ai_disabled';
    message: string;
    upgradeAvailable: boolean;
    upgradeTierName?: string;
    retryAfter?: number;
    resetDate?: string;
  };
}

/** Feature mapping from simple feature name to tier config key */
export type AiFeatureKey =
  | 'student_coaching'
  | 'project_scoping'
  | 'portfolio_intelligence'
  | 'talent_insights'
  | 'institutional_analytics';
