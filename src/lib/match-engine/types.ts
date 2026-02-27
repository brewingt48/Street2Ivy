/**
 * ProveGround Match Engine™ — Type Definitions
 */

// ============================================================================
// Signal Types
// ============================================================================

export type SignalName = 'temporal' | 'skills' | 'sustainability' | 'growth' | 'trust' | 'network';

export interface SignalResult {
  signal: SignalName;
  score: number; // 0-100
  details: Record<string, unknown>;
}

export interface SignalWeights {
  temporal: number;
  skills: number;
  sustainability: number;
  growth: number;
  trust: number;
  network: number;
}

// ============================================================================
// Composite Score
// ============================================================================

export interface CompositeScore {
  score: number; // 0-100
  signals: Record<SignalName, { score: number; weight: number; details: Record<string, unknown> }>;
  computedAt: string;
  version: number;
}

export interface MatchResult {
  listingId: string;
  studentId: string;
  compositeScore: number;
  signals: CompositeScore['signals'];
  listing: ListingData;
  matchedSkills: string[];
  missingSkills: string[];
  athleticTransferSkills: AthleticTransferSkill[];
}

export interface StudentMatchResult {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string | null;
  compositeScore: number;
  signals: CompositeScore['signals'];
  matchedSkills: string[];
  missingSkills: string[];
  athleticTransferSkills: AthleticTransferSkill[];
}

// ============================================================================
// Student Data (loaded for scoring)
// ============================================================================

export interface StudentData {
  id: string;
  tenantId: string | null;
  skills: StudentSkill[];
  schedules: StudentScheduleEntry[];
  sportName: string | null;
  position: string | null;
  hoursPerWeek: number;
  applicationHistory: ApplicationHistoryEntry[];
  completionRate: number;
  onTimeRate: number;
  avgRating: number | null;
  ratingCount: number;
  activeConcurrentListings: number;
  joinedAt: string;
  gpa: string | null;
}

export interface StudentSkill {
  name: string;
  category: string;
  proficiencyLevel: number; // 1-5
}

export interface StudentScheduleEntry {
  id: string;
  scheduleType: string;
  sportSeasonId: string | null;
  sportName?: string;
  seasonType?: string;
  startMonth?: number;
  endMonth?: number;
  practiceHoursPerWeek: number;
  competitionHoursPerWeek: number;
  travelDaysPerMonth: number;
  intensityLevel: number;
  customBlocks: CustomBlock[];
  travelConflicts: TravelConflict[];
  availableHoursPerWeek: number | null;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  isActive: boolean;
}

export interface CustomBlock {
  day: string;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface TravelConflict {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ApplicationHistoryEntry {
  listingId: string;
  status: string;
  category: string | null;
  skillsRequired: string[];
  appliedAt: string;
}

// ============================================================================
// Listing Data (loaded for scoring)
// ============================================================================

export interface ListingData {
  id: string;
  title: string;
  description: string;
  category: string | null;
  skillsRequired: string[];
  hoursPerWeek: number | null;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  remoteAllowed: boolean;
  compensation: string | null;
  isPaid: boolean;
  tenantId: string | null;
  authorId: string;
  companyName: string | null;
  publishedAt: string | null;
  maxStudents: number;
  studentsAccepted: number;
}

// ============================================================================
// Athletic Transfer
// ============================================================================

export interface AthleticTransferSkill {
  professionalSkill: string;
  transferStrength: number;
  sourceSport: string;
  sourcePosition: string | null;
  skillCategory: string;
}

// ============================================================================
// Config
// ============================================================================

export interface MatchEngineConfigData {
  signalWeights: SignalWeights;
  minScoreThreshold: number;
  maxResultsPerQuery: number;
  enableAthleticTransfer: boolean;
  enableScheduleMatching: boolean;
  staleThresholdHours: number;
  batchSize: number;
}

// ============================================================================
// Cache
// ============================================================================

export interface CachedMatchScore {
  id: string;
  studentId: string;
  listingId: string;
  tenantId: string | null;
  compositeScore: number;
  signalBreakdown: CompositeScore['signals'];
  isStale: boolean;
  version: number;
  computedAt: string;
}
