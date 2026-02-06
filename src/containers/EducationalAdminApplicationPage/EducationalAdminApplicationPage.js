import React, { useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import {
  Page,
  LayoutSingleColumn,
  NamedLink,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import { submitEducationalAdminApplication } from '../../util/api';

import css from './EducationalAdminApplicationPage.module.css';

const EducationalAdminApplicationPageComponent = props => {
  const { scrollingDisabled, currentUser } = props;
  const intl = useIntl();
  const history = useHistory();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    institutionName: '',
    institutionWebsite: '',
    jobTitle: '',
    department: '',
    workPhone: '',
    reason: '',
    studentCount: '',
    agreeToTerms: false,
  });

  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const title = intl.formatMessage({ id: 'EducationalAdminApplicationPage.title' });

  // If user is already logged in as educational admin, redirect to dashboard
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  if (publicData.userType === 'educational-admin') {
    history.push('/education/dashboard');
    return null;
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitInProgress(true);
    setSubmitError(null);

    try {
      await submitEducationalAdminApplication(formData);
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Application submission error:', error);
      setSubmitError(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitInProgress(false);
    }
  };

  if (submitSuccess) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.pageContent}>
            <div className={css.successContainer}>
              <div className={css.successIcon}>✓</div>
              <h1 className={css.successTitle}>
                <FormattedMessage id="EducationalAdminApplicationPage.successTitle" />
              </h1>
              <p className={css.successMessage}>
                <FormattedMessage id="EducationalAdminApplicationPage.successMessage" />
              </p>
              <p className={css.successDetails}>
                <FormattedMessage id="EducationalAdminApplicationPage.successDetails" />
              </p>
              <NamedLink name="LandingPage" className={css.backButton}>
                <FormattedMessage id="EducationalAdminApplicationPage.backToHome" />
              </NamedLink>
            </div>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          <div className={css.header}>
            <h1 className={css.pageTitle}>
              <FormattedMessage id="EducationalAdminApplicationPage.pageTitle" />
            </h1>
            <p className={css.pageSubtitle}>
              <FormattedMessage id="EducationalAdminApplicationPage.pageSubtitle" />
            </p>
          </div>

          <div className={css.benefitsSection}>
            <h2 className={css.benefitsTitle}>
              <FormattedMessage id="EducationalAdminApplicationPage.benefitsTitle" />
            </h2>
            <div className={css.benefitsGrid}>
              <div className={css.benefitCard}>
                <div className={css.benefitIcon}>📊</div>
                <h3><FormattedMessage id="EducationalAdminApplicationPage.benefit1Title" /></h3>
                <p><FormattedMessage id="EducationalAdminApplicationPage.benefit1Desc" /></p>
              </div>
              <div className={css.benefitCard}>
                <div className={css.benefitIcon}>👥</div>
                <h3><FormattedMessage id="EducationalAdminApplicationPage.benefit2Title" /></h3>
                <p><FormattedMessage id="EducationalAdminApplicationPage.benefit2Desc" /></p>
              </div>
              <div className={css.benefitCard}>
                <div className={css.benefitIcon}>🎯</div>
                <h3><FormattedMessage id="EducationalAdminApplicationPage.benefit3Title" /></h3>
                <p><FormattedMessage id="EducationalAdminApplicationPage.benefit3Desc" /></p>
              </div>
              <div className={css.benefitCard}>
                <div className={css.benefitIcon}>💬</div>
                <h3><FormattedMessage id="EducationalAdminApplicationPage.benefit4Title" /></h3>
                <p><FormattedMessage id="EducationalAdminApplicationPage.benefit4Desc" /></p>
              </div>
            </div>
          </div>

          <div className={css.formSection}>
            <h2 className={css.formTitle}>
              <FormattedMessage id="EducationalAdminApplicationPage.formTitle" />
            </h2>

            {submitError && (
              <div className={css.errorMessage}>{submitError}</div>
            )}

            <form className={css.applicationForm} onSubmit={handleSubmit}>
              <div className={css.formGroup}>
                <h3 className={css.formGroupTitle}>
                  <FormattedMessage id="EducationalAdminApplicationPage.personalInfo" />
                </h3>
                <div className={css.formRow}>
                  <div className={css.formField}>
                    <label htmlFor="firstName">
                      <FormattedMessage id="EducationalAdminApplicationPage.firstName" /> *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={e => handleChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className={css.formField}>
                    <label htmlFor="lastName">
                      <FormattedMessage id="EducationalAdminApplicationPage.lastName" /> *
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={e => handleChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={css.formRow}>
                  <div className={css.formField}>
                    <label htmlFor="email">
                      <FormattedMessage id="EducationalAdminApplicationPage.email" /> *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="yourname@university.edu"
                      required
                    />
                    <span className={css.fieldHint}>
                      <FormattedMessage id="EducationalAdminApplicationPage.emailHint" />
                    </span>
                  </div>
                  <div className={css.formField}>
                    <label htmlFor="workPhone">
                      <FormattedMessage id="EducationalAdminApplicationPage.workPhone" />
                    </label>
                    <input
                      id="workPhone"
                      type="tel"
                      value={formData.workPhone}
                      onChange={e => handleChange('workPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={css.formGroup}>
                <h3 className={css.formGroupTitle}>
                  <FormattedMessage id="EducationalAdminApplicationPage.institutionInfo" />
                </h3>
                <div className={css.formRow}>
                  <div className={css.formField}>
                    <label htmlFor="institutionName">
                      <FormattedMessage id="EducationalAdminApplicationPage.institutionName" /> *
                    </label>
                    <input
                      id="institutionName"
                      type="text"
                      value={formData.institutionName}
                      onChange={e => handleChange('institutionName', e.target.value)}
                      placeholder="e.g. Harvard University"
                      required
                    />
                  </div>
                  <div className={css.formField}>
                    <label htmlFor="institutionWebsite">
                      <FormattedMessage id="EducationalAdminApplicationPage.institutionWebsite" /> *
                    </label>
                    <input
                      id="institutionWebsite"
                      type="url"
                      value={formData.institutionWebsite}
                      onChange={e => handleChange('institutionWebsite', e.target.value)}
                      placeholder="https://www.university.edu"
                      required
                    />
                  </div>
                </div>
                <div className={css.formRow}>
                  <div className={css.formField}>
                    <label htmlFor="jobTitle">
                      <FormattedMessage id="EducationalAdminApplicationPage.jobTitle" /> *
                    </label>
                    <input
                      id="jobTitle"
                      type="text"
                      value={formData.jobTitle}
                      onChange={e => handleChange('jobTitle', e.target.value)}
                      placeholder="e.g. Director of Career Services"
                      required
                    />
                  </div>
                  <div className={css.formField}>
                    <label htmlFor="department">
                      <FormattedMessage id="EducationalAdminApplicationPage.department" /> *
                    </label>
                    <select
                      id="department"
                      value={formData.department}
                      onChange={e => handleChange('department', e.target.value)}
                      required
                    >
                      <option value="">Select department...</option>
                      <option value="career-services">Career Services</option>
                      <option value="student-affairs">Student Affairs</option>
                      <option value="academic-affairs">Academic Affairs</option>
                      <option value="experiential-learning">Experiential Learning</option>
                      <option value="internship-office">Internship Office</option>
                      <option value="alumni-relations">Alumni Relations</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className={css.formRow}>
                  <div className={css.formField}>
                    <label htmlFor="studentCount">
                      <FormattedMessage id="EducationalAdminApplicationPage.studentCount" /> *
                    </label>
                    <select
                      id="studentCount"
                      value={formData.studentCount}
                      onChange={e => handleChange('studentCount', e.target.value)}
                      required
                    >
                      <option value="">Select size...</option>
                      <option value="under-1000">Under 1,000 students</option>
                      <option value="1000-5000">1,000 - 5,000 students</option>
                      <option value="5000-15000">5,000 - 15,000 students</option>
                      <option value="15000-30000">15,000 - 30,000 students</option>
                      <option value="over-30000">Over 30,000 students</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={css.formGroup}>
                <h3 className={css.formGroupTitle}>
                  <FormattedMessage id="EducationalAdminApplicationPage.additionalInfo" />
                </h3>
                <div className={css.formField}>
                  <label htmlFor="reason">
                    <FormattedMessage id="EducationalAdminApplicationPage.reason" /> *
                  </label>
                  <textarea
                    id="reason"
                    value={formData.reason}
                    onChange={e => handleChange('reason', e.target.value)}
                    placeholder="Tell us how you plan to use Street2Ivy to help your students..."
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className={css.formGroup}>
                <div className={css.checkboxField}>
                  <input
                    id="agreeToTerms"
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={e => handleChange('agreeToTerms', e.target.checked)}
                    required
                  />
                  <label htmlFor="agreeToTerms">
                    <FormattedMessage
                      id="EducationalAdminApplicationPage.agreeToTerms"
                      values={{
                        termsLink: (
                          <NamedLink name="TermsOfServicePage">
                            <FormattedMessage id="EducationalAdminApplicationPage.termsLink" />
                          </NamedLink>
                        ),
                        privacyLink: (
                          <NamedLink name="PrivacyPolicyPage">
                            <FormattedMessage id="EducationalAdminApplicationPage.privacyLink" />
                          </NamedLink>
                        ),
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className={css.formActions}>
                <button
                  type="submit"
                  className={css.submitButton}
                  disabled={submitInProgress || !formData.agreeToTerms}
                >
                  {submitInProgress ? (
                    <FormattedMessage id="EducationalAdminApplicationPage.submitting" />
                  ) : (
                    <FormattedMessage id="EducationalAdminApplicationPage.submitButton" />
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className={css.contactSection}>
            <h3><FormattedMessage id="EducationalAdminApplicationPage.questionsTitle" /></h3>
            <p>
              <FormattedMessage
                id="EducationalAdminApplicationPage.questionsMessage"
                values={{
                  email: <a href="mailto:partnerships@street2ivy.com">partnerships@street2ivy.com</a>,
                }}
              />
            </p>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
  };
};

const EducationalAdminApplicationPage = compose(
  connect(mapStateToProps)
)(EducationalAdminApplicationPageComponent);

export default EducationalAdminApplicationPage;
