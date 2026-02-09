import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { Page, DashboardErrorBoundary } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { acceptInvitation } from './AlumniJoinPage.duck';
import css from './AlumniJoinPage.module.css';

const AlumniJoinPageComponent = props => {
  const {
    scrollingDisabled,
    invitation,
    verifyInProgress,
    verifyError,
    acceptInProgress,
    acceptSuccess,
    acceptError,
    onAcceptInvitation,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const { invitationCode } = useParams();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    currentCompany: '',
    currentRole: '',
  });
  const [formError, setFormError] = useState(null);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    // Note: In a real implementation, you would call the Sharetribe SDK signup here
    // For now, we demonstrate the flow with the accept invitation call
    try {
      await onAcceptInvitation({
        invitationCode,
        userId: 'pending-signup', // Would be replaced with actual user ID after signup
      });
      history.push('/alumni/dashboard');
    } catch (err) {
      setFormError(err.message || 'Failed to accept invitation.');
    }
  };

  const title = intl.formatMessage({ id: 'AlumniJoinPage.title' });

  // Loading state
  if (verifyInProgress) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <TopbarContainer />
        <div className={css.root}>
          <div className={css.card}>
            <div className={css.loadingState}>
              <p>{intl.formatMessage({ id: 'AlumniJoinPage.verifying' })}</p>
            </div>
          </div>
        </div>
        <FooterContainer />
      </Page>
    );
  }

  // Error state (invalid or expired invitation)
  if (verifyError || !invitation) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <TopbarContainer />
        <div className={css.root}>
          <div className={css.card}>
            <div className={css.errorState}>
              <h2 className={css.errorTitle}>
                {intl.formatMessage({ id: 'AlumniJoinPage.invalidInvitation' })}
              </h2>
              <p className={css.errorMessage}>
                {intl.formatMessage({ id: 'AlumniJoinPage.invalidInvitationMessage' })}
              </p>
            </div>
          </div>
        </div>
        <FooterContainer />
      </Page>
    );
  }

  // Success state
  if (acceptSuccess) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <TopbarContainer />
        <div className={css.root}>
          <div className={css.card}>
            <div className={css.successState}>
              <h2 className={css.successTitle}>
                {intl.formatMessage({ id: 'AlumniJoinPage.successTitle' })}
              </h2>
              <p>{intl.formatMessage({ id: 'AlumniJoinPage.successMessage' })}</p>
            </div>
          </div>
        </div>
        <FooterContainer />
      </Page>
    );
  }

  // Valid invitation — show signup form
  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <TopbarContainer />
      <DashboardErrorBoundary pageName="AlumniJoinPage">
      <div className={css.root}>
        <div className={css.card}>
          <h1 className={css.title}>{title}</h1>
          <p className={css.subtitle}>
            {intl.formatMessage(
              { id: 'AlumniJoinPage.subtitle' },
              { institutionDomain: invitation.institutionDomain }
            )}
          </p>

          <form onSubmit={handleSubmit} className={css.form}>
            {/* Read-only invitation fields */}
            <div className={css.readOnlySection}>
              <div className={css.readOnlyField}>
                <label className={css.fieldLabel}>First Name</label>
                <div className={css.readOnlyValue}>{invitation.firstName}</div>
              </div>
              <div className={css.readOnlyField}>
                <label className={css.fieldLabel}>Last Name</label>
                <div className={css.readOnlyValue}>{invitation.lastName}</div>
              </div>
              <div className={css.readOnlyField}>
                <label className={css.fieldLabel}>Email</label>
                <div className={css.readOnlyValue}>{invitation.email}</div>
              </div>
              <div className={css.readOnlyField}>
                <label className={css.fieldLabel}>Institution</label>
                <div className={css.readOnlyValue}>{invitation.institutionDomain}</div>
              </div>
              {invitation.graduationYear && (
                <div className={css.readOnlyField}>
                  <label className={css.fieldLabel}>Graduation Year</label>
                  <div className={css.readOnlyValue}>{invitation.graduationYear}</div>
                </div>
              )}
            </div>

            {/* Editable fields */}
            <div className={css.formSection}>
              <h3 className={css.formSectionTitle}>
                {intl.formatMessage({ id: 'AlumniJoinPage.createAccount' })}
              </h3>

              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={css.input}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={css.input}
                  required
                />
              </div>

              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="currentCompany">Current Company (optional)</label>
                <input
                  id="currentCompany"
                  type="text"
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleInputChange}
                  className={css.input}
                  placeholder="e.g. Google, Goldman Sachs"
                />
              </div>

              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="currentRole">Current Role (optional)</label>
                <input
                  id="currentRole"
                  type="text"
                  name="currentRole"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  className={css.input}
                  placeholder="e.g. Software Engineer, Analyst"
                />
              </div>
            </div>

            {(formError || acceptError) && (
              <div className={css.formError}>
                {formError || 'An error occurred. Please try again.'}
              </div>
            )}

            <button
              type="submit"
              className={css.submitButton}
              disabled={acceptInProgress}
            >
              {acceptInProgress
                ? intl.formatMessage({ id: 'AlumniJoinPage.submitting' })
                : intl.formatMessage({ id: 'AlumniJoinPage.joinButton' })}
            </button>
          </form>
        </div>
      </div>
      </DashboardErrorBoundary>
      <FooterContainer />
    </Page>
  );
};

const mapStateToProps = state => {
  const {
    invitation,
    verifyInProgress,
    verifyError,
    acceptInProgress,
    acceptSuccess,
    acceptError,
  } = state.AlumniJoinPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    invitation,
    verifyInProgress,
    verifyError,
    acceptInProgress,
    acceptSuccess,
    acceptError,
  };
};

const mapDispatchToProps = dispatch => ({
  onAcceptInvitation: data => dispatch(acceptInvitation(data)),
});

const AlumniJoinPage = compose(connect(mapStateToProps, mapDispatchToProps))(
  AlumniJoinPageComponent
);

export default AlumniJoinPage;
