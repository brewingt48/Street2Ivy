/////////////////////////////////////////////////////////
// Configurations related to user.                     //
/////////////////////////////////////////////////////////

// Note: The userFields come from userFields asset nowadays by default.
//       To use this built-in configuration, you need to change the overwrite from configHelper.js
//       (E.g. use mergeDefaultTypesAndFieldsForDebugging func)

/**
 * Configuration options for user fields (custom extended data fields):
 * - key:                           Unique key for the extended data field.
 * - scope (optional):              Scope of the extended data can be either 'public', 'protected', or 'private'.
 *                                  Default value: 'public'.
 * - schemaType (optional):         Schema for this extended data field.
 *                                  This is relevant when rendering components.
 *                                  Possible values: 'enum', 'multi-enum', 'text', 'long', 'boolean'.
 * - enumOptions (optional):        Options shown for 'enum' and 'multi-enum' extended data.
 *                                  These are used to render options for inputs on
 *                                  ProfileSettingsPage and AuthenticationPage.
 * - showConfig:                    Configuration for rendering user information. (How the field should be shown.)
 *   - label:                         Label for the saved data.
 *   - displayInProfile (optional):   Can be used to hide field content from profile page.
 *                                    Default value: true.
 * - saveConfig:                    Configuration for adding and modifying extended data fields.
 *   - label:                         Label for the input field.
 *   - placeholderMessage (optional): Default message for user input.
 *   - isRequired (optional):         Is the field required for users to fill
 *   - requiredMessage (optional):    Message for mandatory fields.
 *   - displayInSignUp (optional):    Can be used to show field input on sign up page.
 *                                    Default value: true.
 * - userTypeConfig:                Configuration for limiting user field to specific user types.
 *   - limitToUserTypeIds:            Can be used to determine whether to limit the field to certain user types. The
 *                                    Console based asset configurations do not yet support user types, so in hosted configurations
 *                                    the default value for this is 'false'.
 *   - userTypeIds:                   An array of user types for which the extended
 *   (optional)                       data is relevant and should be added.
 */
export const userFields = [
  // =====================
  // Student-specific fields
  // =====================
  {
    key: 'university',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'University',
    },
    saveConfig: {
      label: 'University',
      placeholderMessage: 'e.g. Harvard University',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },
  {
    key: 'major',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Major',
    },
    saveConfig: {
      label: 'Major',
      placeholderMessage: 'e.g. Computer Science',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },
  {
    key: 'graduationYear',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: '2024', label: '2024' },
      { option: '2025', label: '2025' },
      { option: '2026', label: '2026' },
      { option: '2027', label: '2027' },
      { option: '2028', label: '2028' },
      { option: '2029', label: '2029' },
      { option: '2030', label: '2030' },
    ],
    showConfig: {
      label: 'Graduation Year',
    },
    saveConfig: {
      label: 'Graduation Year',
      placeholderMessage: 'Select graduation year...',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },
  {
    key: 'skills',
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
    ],
    showConfig: {
      label: 'Skills',
    },
    saveConfig: {
      label: 'Skills',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },

  {
    key: 'studentState',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'AL', label: 'Alabama' },
      { option: 'AK', label: 'Alaska' },
      { option: 'AZ', label: 'Arizona' },
      { option: 'AR', label: 'Arkansas' },
      { option: 'CA', label: 'California' },
      { option: 'CO', label: 'Colorado' },
      { option: 'CT', label: 'Connecticut' },
      { option: 'DE', label: 'Delaware' },
      { option: 'DC', label: 'District of Columbia' },
      { option: 'FL', label: 'Florida' },
      { option: 'GA', label: 'Georgia' },
      { option: 'HI', label: 'Hawaii' },
      { option: 'ID', label: 'Idaho' },
      { option: 'IL', label: 'Illinois' },
      { option: 'IN', label: 'Indiana' },
      { option: 'IA', label: 'Iowa' },
      { option: 'KS', label: 'Kansas' },
      { option: 'KY', label: 'Kentucky' },
      { option: 'LA', label: 'Louisiana' },
      { option: 'ME', label: 'Maine' },
      { option: 'MD', label: 'Maryland' },
      { option: 'MA', label: 'Massachusetts' },
      { option: 'MI', label: 'Michigan' },
      { option: 'MN', label: 'Minnesota' },
      { option: 'MS', label: 'Mississippi' },
      { option: 'MO', label: 'Missouri' },
      { option: 'MT', label: 'Montana' },
      { option: 'NE', label: 'Nebraska' },
      { option: 'NV', label: 'Nevada' },
      { option: 'NH', label: 'New Hampshire' },
      { option: 'NJ', label: 'New Jersey' },
      { option: 'NM', label: 'New Mexico' },
      { option: 'NY', label: 'New York' },
      { option: 'NC', label: 'North Carolina' },
      { option: 'ND', label: 'North Dakota' },
      { option: 'OH', label: 'Ohio' },
      { option: 'OK', label: 'Oklahoma' },
      { option: 'OR', label: 'Oregon' },
      { option: 'PA', label: 'Pennsylvania' },
      { option: 'RI', label: 'Rhode Island' },
      { option: 'SC', label: 'South Carolina' },
      { option: 'SD', label: 'South Dakota' },
      { option: 'TN', label: 'Tennessee' },
      { option: 'TX', label: 'Texas' },
      { option: 'UT', label: 'Utah' },
      { option: 'VT', label: 'Vermont' },
      { option: 'VA', label: 'Virginia' },
      { option: 'WA', label: 'Washington' },
      { option: 'WV', label: 'West Virginia' },
      { option: 'WI', label: 'Wisconsin' },
      { option: 'WY', label: 'Wyoming' },
    ],
    showConfig: {
      label: 'State',
    },
    saveConfig: {
      label: 'State',
      placeholderMessage: 'Select your state...',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },
  {
    key: 'interests',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'technology', label: 'Technology' },
      { option: 'finance', label: 'Finance & Banking' },
      { option: 'consulting', label: 'Consulting' },
      { option: 'healthcare', label: 'Healthcare' },
      { option: 'education', label: 'Education' },
      { option: 'manufacturing', label: 'Manufacturing' },
      { option: 'retail', label: 'Retail & E-commerce' },
      { option: 'media', label: 'Media & Entertainment' },
      { option: 'nonprofit', label: 'Nonprofit' },
      { option: 'government', label: 'Government' },
      { option: 'energy', label: 'Energy' },
      { option: 'real-estate', label: 'Real Estate' },
      { option: 'legal', label: 'Legal' },
      { option: 'startups', label: 'Startups' },
    ],
    showConfig: {
      label: 'Industry Interests',
    },
    saveConfig: {
      label: 'Industry Interests',
      placeholderMessage: 'Select industries you are interested in...',
      displayInSignUp: true,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },
  {
    key: 'portfolioLinks',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Portfolio & Links',
    },
    saveConfig: {
      label: 'Portfolio & Links',
      placeholderMessage: 'e.g. github.com/username, linkedin.com/in/name, portfolio.com',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['student'],
    },
  },

  // ================================
  // Corporate partner-specific fields
  // ================================
  {
    key: 'companyName',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Company Name',
    },
    saveConfig: {
      label: 'Company Name',
      placeholderMessage: 'e.g. Acme Corp',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
    },
  },
  {
    key: 'industry',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'technology', label: 'Technology' },
      { option: 'finance', label: 'Finance & Banking' },
      { option: 'consulting', label: 'Consulting' },
      { option: 'healthcare', label: 'Healthcare' },
      { option: 'education', label: 'Education' },
      { option: 'manufacturing', label: 'Manufacturing' },
      { option: 'retail', label: 'Retail & E-commerce' },
      { option: 'media', label: 'Media & Entertainment' },
      { option: 'nonprofit', label: 'Nonprofit' },
      { option: 'government', label: 'Government' },
      { option: 'energy', label: 'Energy' },
      { option: 'real-estate', label: 'Real Estate' },
      { option: 'legal', label: 'Legal' },
      { option: 'other', label: 'Other' },
    ],
    showConfig: {
      label: 'Industry',
    },
    saveConfig: {
      label: 'Industry',
      placeholderMessage: 'Select industry...',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
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
      { option: '501-1000', label: '501-1000 employees' },
      { option: '1001-5000', label: '1001-5000 employees' },
      { option: '5001+', label: '5001+ employees' },
    ],
    showConfig: {
      label: 'Company Size',
    },
    saveConfig: {
      label: 'Company Size',
      placeholderMessage: 'Select company size...',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
    },
  },
  {
    key: 'companyState',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'AL', label: 'Alabama' },
      { option: 'AK', label: 'Alaska' },
      { option: 'AZ', label: 'Arizona' },
      { option: 'AR', label: 'Arkansas' },
      { option: 'CA', label: 'California' },
      { option: 'CO', label: 'Colorado' },
      { option: 'CT', label: 'Connecticut' },
      { option: 'DE', label: 'Delaware' },
      { option: 'DC', label: 'District of Columbia' },
      { option: 'FL', label: 'Florida' },
      { option: 'GA', label: 'Georgia' },
      { option: 'HI', label: 'Hawaii' },
      { option: 'ID', label: 'Idaho' },
      { option: 'IL', label: 'Illinois' },
      { option: 'IN', label: 'Indiana' },
      { option: 'IA', label: 'Iowa' },
      { option: 'KS', label: 'Kansas' },
      { option: 'KY', label: 'Kentucky' },
      { option: 'LA', label: 'Louisiana' },
      { option: 'ME', label: 'Maine' },
      { option: 'MD', label: 'Maryland' },
      { option: 'MA', label: 'Massachusetts' },
      { option: 'MI', label: 'Michigan' },
      { option: 'MN', label: 'Minnesota' },
      { option: 'MS', label: 'Mississippi' },
      { option: 'MO', label: 'Missouri' },
      { option: 'MT', label: 'Montana' },
      { option: 'NE', label: 'Nebraska' },
      { option: 'NV', label: 'Nevada' },
      { option: 'NH', label: 'New Hampshire' },
      { option: 'NJ', label: 'New Jersey' },
      { option: 'NM', label: 'New Mexico' },
      { option: 'NY', label: 'New York' },
      { option: 'NC', label: 'North Carolina' },
      { option: 'ND', label: 'North Dakota' },
      { option: 'OH', label: 'Ohio' },
      { option: 'OK', label: 'Oklahoma' },
      { option: 'OR', label: 'Oregon' },
      { option: 'PA', label: 'Pennsylvania' },
      { option: 'RI', label: 'Rhode Island' },
      { option: 'SC', label: 'South Carolina' },
      { option: 'SD', label: 'South Dakota' },
      { option: 'TN', label: 'Tennessee' },
      { option: 'TX', label: 'Texas' },
      { option: 'UT', label: 'Utah' },
      { option: 'VT', label: 'Vermont' },
      { option: 'VA', label: 'Virginia' },
      { option: 'WA', label: 'Washington' },
      { option: 'WV', label: 'West Virginia' },
      { option: 'WI', label: 'Wisconsin' },
      { option: 'WY', label: 'Wyoming' },
    ],
    showConfig: {
      label: 'State',
    },
    saveConfig: {
      label: 'Company State / Location',
      placeholderMessage: 'Select your company state...',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
    },
  },
  {
    key: 'department',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Department',
    },
    saveConfig: {
      label: 'Department',
      placeholderMessage: 'e.g. Marketing, Engineering, Product',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
    },
  },
  {
    key: 'companyWebsite',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Company Website',
    },
    saveConfig: {
      label: 'Company Website',
      placeholderMessage: 'e.g. https://www.acmecorp.com',
      displayInSignUp: true,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
    },
  },
  {
    key: 'companyDescription',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'About the Company',
    },
    saveConfig: {
      label: 'About the Company',
      placeholderMessage: 'Tell students about your company, culture, and what makes it a great place to work...',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['corporate-partner'],
    },
  },
];

/////////////////////////////////////
// Street2Ivy user types           //
/////////////////////////////////////
/**
 * Two user types for Street2Ivy:
 * - student: College students looking for career opportunities
 * - corporate-partner: Companies offering opportunities to students
 *
 * These match the user types created in Sharetribe Console.
 * Users choose their type when signing up, and see different
 * profile fields based on their selection.
 */

export const userTypes = [
  {
    userType: 'student',
    label: 'Student',
  },
  {
    userType: 'corporate-partner',
    label: 'Corporate Partner',
  },
];
