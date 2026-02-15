/////////////////////////////////////////////////////////
// Configurations related to listing.                  //
// Main configuration here is the extended data config //
/////////////////////////////////////////////////////////

// Note: The listingFields come from listingFields asset nowadays by default.
//       To use this built-in configuration, you need to change the overwrite from configHelper.js
//       (E.g. use mergeDefaultTypesAndFieldsForDebugging func)

/**
 * Configuration options for listing fields (custom extended data fields):
 * - key:                           Unique key for the extended data field.
 * - scope (optional):              Scope of the extended data can be either 'public' or 'private'.
 *                                  Default value: 'public'.
 *                                  Note: listing doesn't support 'protected' scope atm.
 * - schemaType (optional):         Schema for this extended data field.
 *                                  This is relevant when rendering components and querying listings.
 *                                  Possible values: 'enum', 'multi-enum', 'text', 'long', 'boolean'.
 * - enumOptions (optional):        Options shown for 'enum' and 'multi-enum' extended data.
 *                                  These are used to render options for inputs and filters on
 *                                  EditListingPage, ListingPage, and SearchPage.
 * - listingTypeConfig (optional):  Relationship configuration against listing types.
 *   - limitToListingTypeIds:         Indicator whether this listing field is relevant to a limited set of listing types.
 *   - listingTypeIds:                An array of listing types, for which this custom listing field is
 *                                    relevant and should be added. This is mandatory if limitToListingTypeIds is true.
 * - categoryConfig (optional):     Relationship configuration against categories.
 *   - limitToCategoryIds:            Indicator whether this listing field is relevant to a limited set of categories.
 *   - categoryIds:                   An array of categories, for which this custom listing field is
 *                                    relevant and should be added. This is mandatory if limitToCategoryIds is true.
 * - filterConfig:                  Filter configuration for listings query.
 *    - indexForSearch (optional):    If set as true, it is assumed that the extended data key has
 *                                    search index in place. I.e. the key can be used to filter
 *                                    listing queries (then scope needs to be 'public').
 *                                    Note: Sharetribe CLI can be used to set search index for the key:
 *                                    https://www.sharetribe.com/docs/references/extended-data/#search-schema
 *                                    Read more about filtering listings with public data keys from API Reference:
 *                                    https://www.sharetribe.com/api-reference/marketplace.html#extended-data-filtering
 *                                    Default value: false,
 *   - filterType:                    Sometimes a single schemaType can be rendered with different filter components.
 *                                    For 'enum' schema, filterType can be 'SelectSingleFilter' or 'SelectMultipleFilter'
 *   - label:                         Label for the filter, if the field can be used as query filter
 *   - searchMode (optional):         Search mode for indexed data with multi-enum schema.
 *                                    Possible values: 'has_all' or 'has_any'.
 *   - group:                         SearchPageWithMap has grouped filters. Possible values: 'primary' or 'secondary'.
 * - showConfig:                    Configuration for rendering listing. (How the field should be shown.)
 *   - label:                         Label for the saved data.
 *   - isDetail                       Can be used to hide detail row (of type enum, boolean, or long) from listing page.
 *                                    Default value: true,
 * - saveConfig:                    Configuration for adding and modifying extended data fields.
 *   - label:                         Label for the input field.
 *   - placeholderMessage (optional): Default message for user input.
 *   - isRequired (optional):         Is the field required for providers to fill
 *   - requiredMessage (optional):    Message for those fields, which are mandatory.
 */
export const listingFields = [
  // ─── Street2Ivy: Section 1 - Company Information ────────────────────────────
  {
    key: 'companyName',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Company Name',
    },
    saveConfig: {
      label: 'Company Name',
      placeholderMessage: 'Enter your company name...',
      isRequired: true,
      requiredMessage: 'Company name is required.',
    },
  },
  {
    key: 'companySector',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'technology', label: 'Technology' },
      { option: 'finance', label: 'Finance & Banking' },
      { option: 'consulting', label: 'Consulting' },
      { option: 'healthcare', label: 'Healthcare & Life Sciences' },
      { option: 'education', label: 'Education' },
      { option: 'manufacturing', label: 'Manufacturing' },
      { option: 'retail', label: 'Retail & E-commerce' },
      { option: 'media', label: 'Media & Entertainment' },
      { option: 'nonprofit', label: 'Nonprofit & NGO' },
      { option: 'government', label: 'Government & Public Sector' },
      { option: 'energy', label: 'Energy & Utilities' },
      { option: 'real-estate', label: 'Real Estate' },
      { option: 'legal', label: 'Legal Services' },
      { option: 'transportation', label: 'Transportation & Logistics' },
      { option: 'hospitality', label: 'Hospitality & Travel' },
      { option: 'agriculture', label: 'Agriculture & Food' },
      { option: 'telecommunications', label: 'Telecommunications' },
      { option: 'other', label: 'Other' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Industry/Sector',
      group: 'primary',
    },
    showConfig: {
      label: 'Industry/Sector',
      isDetail: true,
    },
    saveConfig: {
      label: 'Industry/Sector',
      placeholderMessage: 'Select your industry...',
      isRequired: true,
      requiredMessage: 'Please select your industry/sector.',
    },
  },
  {
    key: 'companySize',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: '1-10', label: '1-10 employees' },
      { option: '11-50', label: '11-50 employees' },
      { option: '51-200', label: '51-200 employees' },
      { option: '201-500', label: '201-500 employees' },
      { option: '501-1000', label: '501-1,000 employees' },
      { option: '1001-5000', label: '1,001-5,000 employees' },
      { option: '5001-10000', label: '5,001-10,000 employees' },
      { option: '10001+', label: '10,001+ employees' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Company Size',
      group: 'secondary',
    },
    showConfig: {
      label: 'Company Size',
      isDetail: true,
    },
    saveConfig: {
      label: 'Company Size (employees)',
      placeholderMessage: 'Select company size...',
      isRequired: true,
      requiredMessage: 'Please select your company size.',
    },
  },
  {
    key: 'companyWebsite',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Company Website',
    },
    saveConfig: {
      label: 'Company Website',
      placeholderMessage: 'https://www.yourcompany.com',
      isRequired: false,
    },
  },
  // ─── Street2Ivy: Section 2 - Project Mentor Information ────────────────────────────
  {
    key: 'mentorName',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Project Mentor Name',
    },
    saveConfig: {
      label: 'Project Mentor Name',
      placeholderMessage: 'Name of primary contact and mentor for the student...',
      isRequired: true,
      requiredMessage: 'Please provide a mentor name.',
    },
  },
  {
    key: 'mentorTitle',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Mentor Title',
    },
    saveConfig: {
      label: 'Mentor Title',
      placeholderMessage: 'e.g., Marketing Director, Senior Engineer...',
      isRequired: true,
      requiredMessage: 'Please provide the mentor\'s job title.',
    },
  },
  {
    key: 'mentorEmail',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Mentor Email',
    },
    saveConfig: {
      label: 'Mentor Email',
      placeholderMessage: 'mentor@company.com',
      isRequired: true,
      requiredMessage: 'Please provide the mentor\'s email address.',
    },
  },
  {
    key: 'mentorPhone',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Mentor Phone',
    },
    saveConfig: {
      label: 'Mentor Phone',
      placeholderMessage: '+1 (555) 123-4567',
      isRequired: false,
    },
  },
  // ─── Street2Ivy: Project Details ────────────────────────────
  {
    key: 'projectType',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'research', label: 'Research & Analysis' },
      { option: 'marketing', label: 'Marketing & Branding' },
      { option: 'software', label: 'Software Development' },
      { option: 'data-science', label: 'Data Science & Analytics' },
      { option: 'design', label: 'Design & Creative' },
      { option: 'business-strategy', label: 'Business Strategy' },
      { option: 'operations', label: 'Operations & Process' },
      { option: 'finance-accounting', label: 'Finance & Accounting' },
      { option: 'content-creation', label: 'Content Creation' },
      { option: 'product-development', label: 'Product Development' },
      { option: 'social-impact', label: 'Social Impact & Sustainability' },
      { option: 'consulting', label: 'Consulting Project' },
      { option: 'event-planning', label: 'Event Planning' },
      { option: 'other', label: 'Other' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Project Type',
      group: 'primary',
    },
    showConfig: {
      label: 'Project Type',
      isDetail: true,
    },
    saveConfig: {
      label: 'Project Type',
      placeholderMessage: 'Select the type of project...',
      isRequired: true,
      requiredMessage: 'Please select a project type.',
    },
  },
  {
    key: 'experienceLevel',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'entry', label: 'Entry Level (No experience required)' },
      { option: 'intermediate', label: 'Intermediate (Some experience preferred)' },
      { option: 'advanced', label: 'Advanced (Significant experience required)' },
      { option: 'any', label: 'Any Level Welcome' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Experience Level',
      group: 'primary',
    },
    showConfig: {
      label: 'Experience Level',
      isDetail: true,
    },
    saveConfig: {
      label: 'Experience Level Required',
      placeholderMessage: 'Select required experience level...',
      isRequired: true,
      requiredMessage: 'Please select the experience level required.',
    },
  },
  {
    key: 'projectDuration',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: '1-2-weeks', label: '1-2 weeks' },
      { option: '3-4-weeks', label: '3-4 weeks' },
      { option: '1-2-months', label: '1-2 months' },
      { option: '3-4-months', label: '3-4 months' },
      { option: '1-semester', label: '1 semester' },
      { option: '2-semesters', label: '2 semesters' },
      { option: 'ongoing', label: 'Ongoing/Flexible' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Project Duration',
      group: 'secondary',
    },
    showConfig: {
      label: 'Project Duration',
      isDetail: true,
    },
    saveConfig: {
      label: 'Project Duration',
      placeholderMessage: 'Select expected project duration...',
      isRequired: true,
      requiredMessage: 'Please select the project duration.',
    },
  },
  {
    key: 'workMode',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'remote', label: 'Fully Remote' },
      { option: 'onsite', label: 'On-site' },
      { option: 'hybrid', label: 'Hybrid (Remote & On-site)' },
      { option: 'flexible', label: 'Flexible' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Work Mode',
      group: 'primary',
    },
    showConfig: {
      label: 'Work Mode',
      isDetail: true,
    },
    saveConfig: {
      label: 'Work Mode',
      placeholderMessage: 'Select work arrangement...',
      isRequired: true,
      requiredMessage: 'Please select the work mode.',
    },
  },
  {
    key: 'compensationType',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'paid', label: 'Paid' },
      { option: 'unpaid-credit', label: 'Unpaid (Academic Credit)' },
      { option: 'stipend', label: 'Stipend' },
      { option: 'hourly', label: 'Hourly Rate' },
      { option: 'project-based', label: 'Project-Based Payment' },
      { option: 'negotiable', label: 'Negotiable' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Compensation',
      group: 'secondary',
    },
    showConfig: {
      label: 'Compensation Type',
      isDetail: true,
    },
    saveConfig: {
      label: 'Compensation Type',
      placeholderMessage: 'Select compensation type...',
      isRequired: true,
      requiredMessage: 'Please select the compensation type.',
    },
  },
  {
    key: 'majorPreference',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'business', label: 'Business/Management' },
      { option: 'computer-science', label: 'Computer Science' },
      { option: 'engineering', label: 'Engineering' },
      { option: 'economics', label: 'Economics' },
      { option: 'finance', label: 'Finance' },
      { option: 'marketing', label: 'Marketing' },
      { option: 'communications', label: 'Communications' },
      { option: 'psychology', label: 'Psychology' },
      { option: 'data-science', label: 'Data Science/Statistics' },
      { option: 'design', label: 'Design/Art' },
      { option: 'political-science', label: 'Political Science' },
      { option: 'biology', label: 'Biology/Life Sciences' },
      { option: 'chemistry', label: 'Chemistry' },
      { option: 'physics', label: 'Physics' },
      { option: 'mathematics', label: 'Mathematics' },
      { option: 'environmental', label: 'Environmental Science' },
      { option: 'public-health', label: 'Public Health' },
      { option: 'law', label: 'Pre-Law/Legal Studies' },
      { option: 'journalism', label: 'Journalism/Media' },
      { option: 'any', label: 'Any Major Welcome' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Preferred Major',
      searchMode: 'has_any',
      group: 'secondary',
    },
    showConfig: {
      label: 'Preferred Majors',
    },
    saveConfig: {
      label: 'Preferred Student Majors',
      placeholderMessage: 'Select preferred majors (or Any Major)...',
      isRequired: false,
    },
  },
  {
    key: 'applicationDeadline',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'asap', label: 'ASAP / Rolling' },
      { option: '1-week', label: 'Within 1 week' },
      { option: '2-weeks', label: 'Within 2 weeks' },
      { option: '1-month', label: 'Within 1 month' },
      { option: '2-months', label: 'Within 2 months' },
      { option: 'open', label: 'Open until filled' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Application Deadline',
      group: 'secondary',
    },
    showConfig: {
      label: 'Application Deadline',
      isDetail: true,
    },
    saveConfig: {
      label: 'Application Deadline',
      placeholderMessage: 'When do applications close?',
      isRequired: false,
    },
  },
  {
    key: 'requiredSkills',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'leadership', label: 'Leadership' },
      { option: 'communication', label: 'Communication' },
      { option: 'problem-solving', label: 'Problem Solving' },
      { option: 'teamwork', label: 'Teamwork' },
      { option: 'data-analysis', label: 'Data Analysis' },
      { option: 'project-management', label: 'Project Management' },
      { option: 'marketing', label: 'Marketing' },
      { option: 'finance', label: 'Finance' },
      { option: 'engineering', label: 'Engineering' },
      { option: 'design', label: 'Design' },
      { option: 'sales', label: 'Sales' },
      { option: 'research', label: 'Research' },
      { option: 'writing', label: 'Writing' },
      { option: 'software-development', label: 'Software Development' },
      { option: 'public-speaking', label: 'Public Speaking' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Required Skills',
      searchMode: 'has_any',
      group: 'primary',
    },
    showConfig: {
      label: 'Required Skills',
    },
    saveConfig: {
      label: 'Required Skills',
      placeholderMessage: 'Select the skills needed for this project...',
      isRequired: true,
      requiredMessage: 'Please select at least one required skill.',
    },
  },
  {
    key: 'estimatedHours',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: '1-10', label: '1-10 hours' },
      { option: '11-20', label: '11-20 hours' },
      { option: '21-40', label: '21-40 hours' },
      { option: '41-80', label: '41-80 hours' },
      { option: '80+', label: '80+ hours' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Estimated Hours',
      group: 'secondary',
    },
    showConfig: {
      label: 'Estimated Hours',
      isDetail: true,
    },
    saveConfig: {
      label: 'Estimated Hours',
      placeholderMessage: 'Select estimated time commitment...',
      isRequired: true,
      requiredMessage: 'Please select the estimated hours for this project.',
    },
  },
  {
    key: 'compensationAmount',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Compensation',
    },
    saveConfig: {
      label: 'Compensation',
      placeholderMessage: 'e.g. $500, Unpaid/Credit, $25/hr',
      isRequired: true,
      requiredMessage: 'Please specify the compensation for this project.',
    },
  },
  {
    key: 'deadline',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Deadline',
    },
    saveConfig: {
      label: 'Project Deadline',
      placeholderMessage: 'e.g. March 30, 2025 or 4 weeks from start',
      isRequired: true,
      requiredMessage: 'Please specify a deadline for this project.',
    },
  },
  {
    key: 'studentsNeeded',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: '1', label: '1 student' },
      { option: '2', label: '2 students' },
      { option: '3', label: '3 students' },
      { option: '4', label: '4 students' },
      { option: '5+', label: '5+ students' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectSingleFilter',
      label: 'Students Needed',
      group: 'secondary',
    },
    showConfig: {
      label: 'Students Needed',
      isDetail: true,
    },
    saveConfig: {
      label: 'Number of Students Needed',
      placeholderMessage: 'Select how many students you need...',
      isRequired: true,
      requiredMessage: 'Please select the number of students needed.',
    },
  },
  {
    key: 'industryCategory',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'technology', label: 'Technology' },
      { option: 'finance', label: 'Finance' },
      { option: 'consulting', label: 'Consulting' },
      { option: 'healthcare', label: 'Healthcare' },
      { option: 'education', label: 'Education' },
      { option: 'manufacturing', label: 'Manufacturing' },
      { option: 'retail', label: 'Retail' },
      { option: 'media', label: 'Media & Entertainment' },
      { option: 'nonprofit', label: 'Nonprofit' },
      { option: 'government', label: 'Government' },
      { option: 'energy', label: 'Energy' },
      { option: 'real-estate', label: 'Real Estate' },
      { option: 'legal', label: 'Legal' },
      { option: 'other', label: 'Other' },
    ],
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Industry',
      group: 'primary',
    },
    showConfig: {
      label: 'Industry',
      isDetail: true,
    },
    saveConfig: {
      label: 'Industry Category',
      placeholderMessage: 'Select an industry...',
      isRequired: true,
      requiredMessage: 'Please select an industry category.',
    },
  },
  // ─── Street2Ivy: Confidential Project Details (visible only in workspace) ────
  {
    key: 'confidentialBrief',
    scope: 'public', // Stored in publicData but only shown in workspace after acceptance
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Confidential Project Brief',
      isDetail: false, // Don't show on public listing page
    },
    saveConfig: {
      label: 'Confidential Project Brief',
      placeholderMessage:
        'Detailed project brief that will only be visible to accepted students...',
      isRequired: false,
    },
  },
  {
    key: 'confidentialDeliverables',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Detailed Deliverables',
      isDetail: false,
    },
    saveConfig: {
      label: 'Detailed Deliverables (Confidential)',
      placeholderMessage:
        'Specific deliverables and requirements that will only be visible to accepted students...',
      isRequired: false,
    },
  },
  {
    key: 'contactName',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Project Contact Name',
      isDetail: false,
    },
    saveConfig: {
      label: 'Project Contact Name (Confidential)',
      placeholderMessage: 'Name of person students should contact...',
      isRequired: false,
    },
  },
  {
    key: 'contactEmail',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Project Contact Email',
      isDetail: false,
    },
    saveConfig: {
      label: 'Project Contact Email (Confidential)',
      placeholderMessage: 'Email for project communication...',
      isRequired: false,
    },
  },
  {
    key: 'contactPhone',
    scope: 'public',
    schemaType: 'text',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['project'],
    },
    showConfig: {
      label: 'Project Contact Phone',
      isDetail: false,
    },
    saveConfig: {
      label: 'Project Contact Phone (Confidential)',
      placeholderMessage: 'Phone number for project communication...',
      isRequired: false,
    },
  },
];

///////////////////////////////////////////////////////////////////////
// Configurations related to listing types and transaction processes //
///////////////////////////////////////////////////////////////////////

// A presets of supported listing configurations
//
// Note 1: The listingTypes come from listingTypes asset nowadays by default.
//         To use this built-in configuration, you need to change the overwrite from configHelper.js
//         (E.g. use mergeDefaultTypesAndFieldsForDebugging func)
// Note 2: transaction type is part of listing type. It defines what transaction process and units
//         are used when transaction is created against a specific listing.

/**
 * Configuration options for listing experience:
 * - listingType:         Unique string. This will be saved to listing's public data on
 *                        EditListingWizard.
 * - label                Label for the listing type. Used as microcopy for options to select
 *                        listing type in EditListingWizard.
 * - transactionType      Set of configurations how this listing type will behave when transaction is
 *                        created.
 *   - process              Transaction process.
 *                          The process must match one of the processes that this client app can handle
 *                          (check src/util/transactions/transaction.js) and the process must also exists in correct
 *                          marketplace environment.
 *   - alias                Valid alias for the aforementioned process. This will be saved to listing's
 *                          public data as transctionProcessAlias and transaction is initiated with this.
 *   - unitType             Unit type is mainly used as pricing unit. This will be saved to
 *                          transaction's protected data.
 *                          Recommendation: don't use same unit types in completely different processes
 *                          ('item' sold should not be priced the same as 'item' booked).
 * - stockType            This is relevant only to listings using default-purchase process.
 *                        If set to 'oneItem', stock management is not showed and the listing is
 *                        considered unique (stock = 1).
 *                        Possible values: 'oneItem', 'multipleItems', 'infiniteOneItem', and 'infiniteMultipleItems'.
 *                        Default: 'multipleItems'.
 * - availabilityType     This is relevant only to listings using default-booking process.
 *                        If set to 'oneSeat', seat management is not showed and the listing is
 *                        considered per person (seat = 1).
 *                        Possible values: 'oneSeat' and 'multipleSeats'.
 *                        Default: 'oneSeat'.
 * - priceVariations      This is relevant only to listings using default-booking process.
 *   - enabled:             If set to true, price variations are enabled.
 *                          Default: false.
 * - defaultListingFields These are tied to transaction processes. Different processes have different flags.
 *                        E.g. default-inquiry can toggle price and location to true/false value to indicate,
 *                        whether price (or location) tab should be shown. If defaultListingFields.price is not
 *                        explicitly set to _false_, price will be shown.
 *                        If the location or pickup is not used, listing won't be returned with location search.
 *                        Use keyword search as main search type if location is not enforced.
 *                        The payoutDetails flag allows provider to bypass setting of payout details.
 *                        Note: customers can't order listings, if provider has not set payout details! Monitor
 *                        providers who have not set payout details and contact them to ensure that they add the details.
 */

export const listingTypes = [
  // ─── Street2Ivy: Project listing type ──────────────────────────────
  {
    listingType: 'project',
    label: 'Project',
    transactionType: {
      process: 'default-project-application',
      alias: 'default-project-application/release-1',
      unitType: 'inquiry',
    },
    defaultListingFields: {
      price: false,
      location: false,
      images: false,
      payoutDetails: false,
    },
  },
];

// SearchPage can enforce listing query to only those listings with valid listingType
// However, it only works if you have set 'enum' type search schema for the public data fields
//   - listingType
//
//  Similar setup could be expanded to 2 other extended data fields:
//   - transactionProcessAlias
//   - unitType
//
// Read More:
// https://www.sharetribe.com/docs/how-to/manage-search-schemas-with-flex-cli/#adding-listing-search-schemas
export const enforceValidListingType = false;
