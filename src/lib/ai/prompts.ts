/**
 * AI System Prompt Builders
 *
 * Constructs context-rich system prompts for different AI coaching scenarios.
 * Each builder takes structured data and returns a well-crafted prompt.
 */

import type { StudentProfileForAi, MatchDataForAi } from './types';

/**
 * Build the main coaching system prompt.
 * Includes student profile context and optionally match data.
 */
export function buildCoachingSystemPrompt(
  student: StudentProfileForAi,
  matchData?: MatchDataForAi
): string {
  const parts: string[] = [
    `You are an AI career coach for Proveground, a platform connecting students with real-world corporate projects and internship opportunities.`,
    ``,
    `Your role is to help students prepare for and succeed in professional opportunities. You should be encouraging, practical, and specific in your advice.`,
    ``,
    `## Student Profile`,
    `- Name: ${student.name}`,
  ];

  if (student.university) parts.push(`- University: ${student.university}`);
  if (student.major) parts.push(`- Major: ${student.major}`);
  if (student.graduationYear) parts.push(`- Expected Graduation: ${student.graduationYear}`);
  if (student.gpa) parts.push(`- GPA: ${student.gpa}`);
  if (student.skills.length > 0) parts.push(`- Skills: ${student.skills.join(', ')}`);
  if (student.sportsPlayed) parts.push(`- Athletics: ${student.sportsPlayed}`);
  if (student.activities) parts.push(`- Activities: ${student.activities}`);
  if (student.bio) parts.push(`- Bio: ${student.bio}`);

  if (matchData) {
    parts.push(``);
    parts.push(`## Current Project Context`);
    parts.push(`- Project: ${matchData.listingTitle}`);
    parts.push(`- Description: ${matchData.listingDescription}`);
    parts.push(`- Required Skills: ${matchData.requiredSkills.join(', ')}`);
    parts.push(`- Match Score: ${matchData.matchScore}%`);
    parts.push(`- Matched Skills: ${matchData.matchedSkills.join(', ') || 'None'}`);
    parts.push(`- Skills to Develop: ${matchData.missingSkills.join(', ') || 'None'}`);
  }

  parts.push(``);
  parts.push(`## Guidelines`);
  parts.push(`- Be conversational but professional`);
  parts.push(`- Give specific, actionable advice tailored to their profile`);
  parts.push(`- Reference their skills, major, and activities when relevant`);
  parts.push(`- Help them articulate their value from academic and extracurricular experience`);
  parts.push(`- If they ask about a specific project, leverage the match data to give targeted advice`);
  parts.push(`- Keep responses focused and concise (aim for 200-400 words unless asked for more detail)`);

  return parts.join('\n');
}

/**
 * Build a resume review prompt.
 */
export function buildResumeReviewPrompt(resumeText: string): string {
  return [
    `You are a professional resume reviewer for Proveground. A student has submitted their resume for review.`,
    ``,
    `## Resume Text`,
    `${resumeText}`,
    ``,
    `## Instructions`,
    `Please review this resume and provide:`,
    `1. **Overall Assessment** - Strengths and areas for improvement (2-3 sentences)`,
    `2. **Specific Suggestions** - 3-5 concrete improvements with before/after examples`,
    `3. **Format Tips** - Any formatting or structure recommendations`,
    `4. **Key Skills to Highlight** - Skills they should emphasize more`,
    ``,
    `Be encouraging but honest. Focus on actionable improvements.`,
  ].join('\n');
}

/**
 * Build an interview preparation prompt.
 */
export function buildInterviewPrepPrompt(role: string, company: string): string {
  return [
    `You are an interview preparation coach for Proveground.`,
    ``,
    `The student is preparing for an interview for the role of "${role}" at "${company}".`,
    ``,
    `Please provide:`,
    `1. **5 Likely Interview Questions** - Tailored to the role and company`,
    `2. **STAR Method Examples** - How to structure behavioral answers`,
    `3. **Technical Preparation** - Key topics to review based on the role`,
    `4. **Questions to Ask** - 3-4 thoughtful questions the student can ask the interviewer`,
    `5. **Quick Tips** - 3 practical tips for interview day`,
    ``,
    `Make your advice specific to the role and company, not generic.`,
  ].join('\n');
}

/**
 * Build a cover letter help prompt.
 */
export function buildCoverLetterPrompt(
  listing: { title: string; description: string; skills: string[] },
  student: StudentProfileForAi
): string {
  return [
    `You are a cover letter writing coach for Proveground.`,
    ``,
    `## Project/Position`,
    `- Title: ${listing.title}`,
    `- Description: ${listing.description}`,
    `- Required Skills: ${listing.skills.join(', ')}`,
    ``,
    `## Student Profile`,
    `- Name: ${student.name}`,
    student.university ? `- University: ${student.university}` : '',
    student.major ? `- Major: ${student.major}` : '',
    student.skills.length > 0 ? `- Skills: ${student.skills.join(', ')}` : '',
    student.activities ? `- Activities: ${student.activities}` : '',
    ``,
    `## Instructions`,
    `Help the student write a compelling cover letter that:`,
    `1. Opens with a strong hook connecting their background to the opportunity`,
    `2. Highlights relevant skills and experiences (matching the required skills)`,
    `3. Shows genuine interest in the specific project/company`,
    `4. Closes with a confident call to action`,
    ``,
    `Write the cover letter in a professional but personable tone. Keep it to 3-4 paragraphs.`,
    `If you don't know enough about the student, point out what they should customize.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Build a project scoping prompt for corporate partners.
 */
export function buildProjectScopingPrompt(projectDescription: string): string {
  return [
    `You are a project scoping assistant for Proveground, helping corporate partners create effective project listings that attract qualified students.`,
    ``,
    `## Project Description`,
    `${projectDescription}`,
    ``,
    `## Instructions`,
    `Please analyze this project description and provide:`,
    ``,
    `1. **Description Review** - Is the description clear, specific, and appealing to students? Suggest improvements.`,
    `2. **Suggested Skills** - List 5-10 specific skills a student would need (technical and soft skills). Format as a JSON array of strings.`,
    `3. **Proposed Milestones** - Break the project into 3-5 milestones with estimated timeframes. Format as a JSON array of objects with "title", "description", and "estimatedWeeks" fields.`,
    `4. **Student Appeal Score** - Rate 1-10 how attractive this project would be to students, with explanation.`,
    ``,
    `Respond in a structured format with clear section headers.`,
  ].join('\n');
}

/**
 * Build a portfolio intelligence prompt for enterprise edu admins.
 */
export function buildPortfolioIntelligencePrompt(aggregateData: {
  totalStudents: number;
  skillDistribution: Record<string, number>;
  completionRate: number;
  avgRating: number | null;
  topSkills: string[];
  topMissingSkills: string[];
}): string {
  return [
    `You are an institutional analytics advisor for Proveground.`,
    ``,
    `## Student Portfolio Data`,
    `- Total Students: ${aggregateData.totalStudents}`,
    `- Project Completion Rate: ${(aggregateData.completionRate * 100).toFixed(1)}%`,
    aggregateData.avgRating ? `- Average Student Rating: ${aggregateData.avgRating.toFixed(1)}/5` : '',
    `- Top Student Skills: ${aggregateData.topSkills.join(', ')}`,
    `- Most Common Skill Gaps: ${aggregateData.topMissingSkills.join(', ')}`,
    ``,
    `## Skill Distribution`,
    ...Object.entries(aggregateData.skillDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => `- ${skill}: ${count} students`),
    ``,
    `## Instructions`,
    `Provide actionable insights:`,
    `1. **Skills Portfolio Assessment** - How well-prepared are students for the market?`,
    `2. **Gap Analysis** - What skills should the institution prioritize teaching?`,
    `3. **Program Recommendations** - Suggestions for curriculum alignment with market demand`,
    `4. **Competitive Positioning** - How does this portfolio compare to industry needs?`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Build a talent insights prompt for enterprise edu admins.
 */
export function buildTalentInsightsPrompt(data: {
  activeListings: number;
  topRequestedSkills: Array<{ skill: string; count: number }>;
  industryBreakdown: Record<string, number>;
  avgHoursPerWeek: number;
}): string {
  return [
    `You are a talent market analyst for Proveground.`,
    ``,
    `## Market Data`,
    `- Active Project Listings: ${data.activeListings}`,
    `- Average Hours/Week Required: ${data.avgHoursPerWeek}`,
    ``,
    `## Most In-Demand Skills`,
    ...data.topRequestedSkills.slice(0, 15).map((s) => `- ${s.skill}: requested in ${s.count} listings`),
    ``,
    `## Industry Breakdown`,
    ...Object.entries(data.industryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([industry, count]) => `- ${industry}: ${count} listings`),
    ``,
    `## Instructions`,
    `Provide talent market insights:`,
    `1. **Demand Trends** - What skills are most sought after and why?`,
    `2. **Emerging Opportunities** - What industries or roles are growing?`,
    `3. **Student Readiness** - How should students prepare for these opportunities?`,
    `4. **Strategic Recommendations** - Actions the institution should take`,
  ].join('\n');
}
