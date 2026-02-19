import React, { useState } from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { apiBaseUrl } from '../../../util/api';

import css from './ApplicationDetailSection.module.css';

/**
 * Formats a date string into a human-readable format.
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
const formatDate = dateStr => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * ApplicationDetailSection
 *
 * Displays the full application details (cover letter, skills, GPA, resume, etc.)
 * inside the TransactionPage for project application transactions.
 *
 * Only rendered when applicationData is available (non-null).
 *
 * @component
 * @param {Object} props
 * @param {Object|null} props.applicationData - Application data from SQLite
 * @param {boolean} props.isLoading - Whether application data is still loading
 * @returns {JSX.Element|null}
 */
const ApplicationDetailSection = ({ applicationData, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className={css.root}>
        <div className={css.loadingState}>
          <FormattedMessage id="ApplicationDetailSection.loading" />
        </div>
      </div>
    );
  }

  if (!applicationData) {
    return null;
  }

  const baseUrl = apiBaseUrl();

  return (
    <div className={css.root}>
      <button
        type="button"
        className={css.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className={css.headerTitle}>
          <FormattedMessage id="ApplicationDetailSection.title" />
        </h3>
        <span className={css.expandIcon}>
          {isExpanded ? '▾' : '▸'}
        </span>
      </button>

      {isExpanded && (
        <div className={css.content}>
          {/* Cover Letter */}
          {applicationData.coverLetter && (
            <div className={css.section}>
              <h4 className={css.sectionTitle}>
                <FormattedMessage id="ApplicationDetailSection.coverLetter" />
              </h4>
              <p className={css.sectionText}>{applicationData.coverLetter}</p>
            </div>
          )}

          {/* Interest Reason */}
          {applicationData.interestReason && (
            <div className={css.section}>
              <h4 className={css.sectionTitle}>
                <FormattedMessage id="ApplicationDetailSection.interestReason" />
              </h4>
              <p className={css.sectionText}>{applicationData.interestReason}</p>
            </div>
          )}

          {/* Skills */}
          {applicationData.skills?.length > 0 && (
            <div className={css.section}>
              <h4 className={css.sectionTitle}>
                <FormattedMessage id="ApplicationDetailSection.skills" />
              </h4>
              <div className={css.skillTags}>
                {(typeof applicationData.skills === 'string'
                  ? JSON.parse(applicationData.skills)
                  : applicationData.skills
                ).map(skill => (
                  <span key={skill} className={css.skillTag}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Info Grid */}
          <div className={css.infoGrid}>
            {applicationData.availabilityDate && (
              <div className={css.infoItem}>
                <span className={css.infoLabel}>
                  <FormattedMessage id="ApplicationDetailSection.availableFrom" />
                </span>
                <span className={css.infoValue}>
                  {formatDate(applicationData.availabilityDate)}
                </span>
              </div>
            )}
            {applicationData.hoursPerWeek && (
              <div className={css.infoItem}>
                <span className={css.infoLabel}>
                  <FormattedMessage id="ApplicationDetailSection.hoursPerWeek" />
                </span>
                <span className={css.infoValue}>{applicationData.hoursPerWeek}</span>
              </div>
            )}
            {applicationData.gpa && (
              <div className={css.infoItem}>
                <span className={css.infoLabel}>
                  <FormattedMessage id="ApplicationDetailSection.gpa" />
                </span>
                <span className={css.infoValue}>{applicationData.gpa}</span>
              </div>
            )}
            {applicationData.relevantCoursework && (
              <div className={css.infoItem}>
                <span className={css.infoLabel}>
                  <FormattedMessage id="ApplicationDetailSection.coursework" />
                </span>
                <span className={css.infoValue}>{applicationData.relevantCoursework}</span>
              </div>
            )}
          </div>

          {/* Resume */}
          {applicationData.resumeAttachment && (
            <div className={css.section}>
              <h4 className={css.sectionTitle}>
                <FormattedMessage id="ApplicationDetailSection.resume" />
              </h4>
              <a
                href={`${baseUrl}/api/attachments/${applicationData.resumeAttachment.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className={css.resumeLink}
              >
                {applicationData.resumeAttachment.name}
                {applicationData.resumeAttachment.size
                  ? ` (${applicationData.resumeAttachment.size})`
                  : ''}
              </a>
            </div>
          )}

          {/* References */}
          {applicationData.referencesText && (
            <div className={css.section}>
              <h4 className={css.sectionTitle}>
                <FormattedMessage id="ApplicationDetailSection.references" />
              </h4>
              <p className={css.sectionText}>{applicationData.referencesText}</p>
            </div>
          )}

          {/* Submission Date */}
          {applicationData.submittedAt && (
            <div className={css.submittedAt}>
              <FormattedMessage
                id="ApplicationDetailSection.submittedAt"
                values={{ date: formatDate(applicationData.submittedAt) }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationDetailSection;
