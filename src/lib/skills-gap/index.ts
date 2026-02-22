export { analyzeStudentGaps, aggregateInstitutionGaps, getRecommendedProjects } from './analyzer';
export type { GapAnalysisResult, GapItem, StrengthItem } from './analyzer';
export { calculateReadinessScore, getReadinessTier, PROFICIENCY_LABELS, READINESS_TIERS } from './scoring';
export type { ReadinessTier } from './scoring';
export { getStudentGapContext } from './coach-context';
