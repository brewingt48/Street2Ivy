import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';
import Cookies from 'js-cookie';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { isEmpty } from '../../util/common';
import { camelize } from '../../util/string';
import { pathByRouteName } from '../../util/routes';
import { apiBaseUrl } from '../../util/api';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import {
  isSignupEmailTakenError,
  isTooManyEmailVerificationRequestsError,
} from '../../util/errors';
import { pickUserFieldsData, addScopePrefix } from '../../util/userHelpers';

import { login, authenticationInProgress, signup, signupWithIdp } from '../../ducks/auth.duck';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { sendVerificationEmail } from '../../ducks/user.duck';

import {
  Page,
  Heading,
  IconSpinner,
  NamedLink,
  NamedRedirect,
  LinkTabNavHorizontal,
  SocialLoginButton,
  ResponsiveBackgroundImageContainer,
  Modal,
  LayoutSingleColumn,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import TermsAndConditions from './TermsAndConditions/TermsAndConditions';
import ConfirmSignupForm from './ConfirmSignupForm/ConfirmSignupForm';
import LoginForm from './LoginForm/LoginForm';
import SignupForm from './SignupForm/SignupForm';
import EmailVerificationInfo from './EmailVerificationInfo';

// We need to get ToS asset and get it rendered for the modal on this page.
import { TermsOfServiceContent } from '../../containers/TermsOfServicePage/TermsOfServicePage';

// We need to get PrivacyPolicy asset and get it rendered for the modal on this page.
import { PrivacyPolicyContent } from '../../containers/PrivacyPolicyPage/PrivacyPolicyPage';

import NotFoundPage from '../NotFoundPage/NotFoundPage';

import { TOS_ASSET_NAME, PRIVACY_POLICY_ASSET_NAME } from './AuthenticationPage.duck';

import css from './AuthenticationPage.module.css';
import { FacebookLogo, GoogleLogo } from './socialLoginLogos';

// Social login buttons are needed by AuthenticationForms
export const SocialLoginButtonsMaybe = props => {
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const { isLogin, showFacebookLogin, showGoogleLogin, from, userType } = props;
  const showSocialLogins = showFacebookLogin || showGoogleLogin;

  const getDataForSSORoutes = () => {
    const baseUrl = apiBaseUrl();

    // Default route where user is returned after successfull authentication
    const defaultReturn = pathByRouteName('LandingPage', routeConfiguration);

    // Route for confirming user data before creating a new user
    const defaultConfirm = pathByRouteName('ConfirmPage', routeConfiguration);

    const queryParams = new URLSearchParams({
      ...(defaultReturn ? { defaultReturn } : {}),
      ...(defaultConfirm ? { defaultConfirm } : {}),
      // Route where the user should be returned after authentication
      // This is used e.g. with EditListingPage and ListingPage
      ...(from ? { from } : {}),
      // The preselected userType needs to be saved over the visit to identity provider's service
      ...(userType ? { userType } : {}),
    });

    return { baseUrl, queryParams: queryParams.toString() };
  };

  const authWithFacebook = () => {
    const { baseUrl, queryParams } = getDataForSSORoutes();
    window.location.href = `${baseUrl}/api/auth/facebook?${queryParams}`;
  };

  const authWithGoogle = () => {
    const { baseUrl, queryParams } = getDataForSSORoutes();
    window.location.href = `${baseUrl}/api/auth/google?${queryParams}`;
  };

  const facebookAuthenticationMessage = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.loginWithFacebook' })
    : intl.formatMessage({ id: 'AuthenticationPage.signupWithFacebook' });

  const googleAuthenticationMessage = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.loginWithGoogle' })
    : intl.formatMessage({ id: 'AuthenticationPage.signupWithGoogle' });
  return showSocialLogins ? (
    <div className={css.idpButtons}>
      <div className={css.socialButtonsOr}>
        <span className={css.socialButtonsOrText}>
          <FormattedMessage id="AuthenticationPage.or" />
        </span>
      </div>

      {showFacebookLogin ? (
        <div className={css.socialButtonWrapper}>
          <SocialLoginButton onClick={() => authWithFacebook()}>
            <span className={css.buttonIcon}>
              <FacebookLogo ariaLabelledBy="facebook-authentication-msg" />
            </span>
            <span id="facebook-authentication-msg">{facebookAuthenticationMessage}</span>
          </SocialLoginButton>
        </div>
      ) : null}

      {showGoogleLogin ? (
        <div className={css.socialButtonWrapper}>
          <SocialLoginButton onClick={() => authWithGoogle()}>
            <span className={css.buttonIcon}>
              <GoogleLogo ariaLabelledBy="google-authentication-msg" />
            </span>
            <span id="google-authentication-msg">{googleAuthenticationMessage}</span>
          </SocialLoginButton>
        </div>
      ) : null}
    </div>
  ) : null;
};

const getNonUserFieldParams = (values, userFieldConfigs) => {
  const userFieldKeys = userFieldConfigs.map(({ scope, key }) => addScopePrefix(scope, key));

  return Object.entries(values).reduce((picked, [key, value]) => {
    const isUserFieldKey = userFieldKeys.includes(key);

    return isUserFieldKey
      ? picked
      : {
          ...picked,
          [key]: value,
        };
  }, {});
};

// Helper function to check if email is .edu (or allowed test domains)
// TEMPORARILY DISABLED: Allow all emails for testing
const isEduEmail = email => {
  // TODO: Re-enable .edu validation after testing
  // For now, allow all emails to pass validation
  return true;

  // Original validation code:
  // if (!email) return false;
  // const domain = email.split('@')[1]?.toLowerCase();
  // if (!domain) return false;
  // const isEdu = domain.endsWith('.edu') || domain.endsWith('.edu.au') || domain.endsWith('.ac.uk');
  // const testDomains = ['test.edu', 'gmail.com'];
  // const isTestDomain = testDomains.includes(domain);
  // return isEdu || isTestDomain;
};

// Tabs for SignupForm and LoginForm
export const AuthenticationForms = props => {
  const {
    isLogin,
    showFacebookLogin,
    showGoogleLogin,
    userType,
    from,
    submitLogin,
    loginError,
    idpAuthError,
    signupError,
    authInProgress,
    submitSignup,
    termsAndConditions,
    isAdminPortal,
  } = props;
  const config = useConfiguration();
  const intl = useIntl();
  const [eduEmailError, setEduEmailError] = useState(null);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState(null);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const { userFields, userTypes = [], adminUserTypes = [] } = config.user;

  // Use admin user types if on admin portal, otherwise use regular user types
  const availableUserTypes = isAdminPortal ? adminUserTypes : userTypes;
  const preselectedUserType =
    availableUserTypes.find(conf => conf.userType === userType)?.userType || null;

  const fromMaybe = from ? { from } : null;

  // Use admin portal routes if on admin portal (login only for admin portal)
  const signupRouteName = !!preselectedUserType ? 'SignupForUserTypePage' : 'SignupPage';
  const loginRouteName = isAdminPortal ? 'AdminPortalLoginPage' : 'LoginPage';

  const userTypeMaybe = preselectedUserType ? { userType: preselectedUserType } : null;
  const fromState = { state: { ...fromMaybe, ...userTypeMaybe } };

  // Admin portal only shows login (no signup tab) - admins are created via Admin Dashboard
  const tabs = isAdminPortal
    ? [
        {
          text: (
            <Heading as="h1" rootClassName={css.tab}>
              <FormattedMessage id="AuthenticationPage.adminLoginLinkText" />
            </Heading>
          ),
          selected: true,
          linkProps: {
            name: loginRouteName,
            to: fromState,
          },
        },
      ]
    : [
        {
          text: (
            <Heading as={!isLogin ? 'h1' : 'h2'} rootClassName={css.tab}>
              <FormattedMessage id="AuthenticationPage.signupLinkText" />
            </Heading>
          ),
          selected: !isLogin,
          linkProps: {
            name: signupRouteName,
            params: userTypeMaybe,
            to: fromState,
          },
        },
        {
          text: (
            <Heading as={isLogin ? 'h1' : 'h2'} rootClassName={css.tab}>
              <FormattedMessage id="AuthenticationPage.loginLinkText" />
            </Heading>
          ),
          selected: isLogin,
          linkProps: {
            name: loginRouteName,
            to: fromState,
          },
        },
      ];

  const handleSubmitSignup = async values => {
    const { userType, email, password, fname, lname, displayName, ...rest } = values;

    // Clear any previous error
    setEduEmailError(null);

    // Validate .edu email for students on submit
    if (userType === 'student' && !isEduEmail(email)) {
      setEduEmailError(intl.formatMessage({ id: 'SignupForm.eduEmailRequired' }));
      return; // Don't submit
    }

    // For students, check if their institution is a member
    if (userType === 'student') {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      try {
        const baseUrl = apiBaseUrl();
        const response = await fetch(`${baseUrl}/api/institutions/check/${encodeURIComponent(emailDomain)}`);
        const data = await response.json();

        if (!data.isMember) {
          // Store the signup data and show the institution modal
          setPendingSignupData({
            email,
            emailDomain,
            firstName: fname,
            lastName: lname,
            institutionName: data.institutionName || null,
          });
          setShowInstitutionModal(true);
          return; // Don't submit - institution not a member
        }
      } catch (error) {
        console.error('Failed to check institution membership:', error);
        // On network error, allow signup to proceed (server will validate)
      }
    }

    const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

    // Store the email domain for institution matching
    const emailDomain = email.split('@')[1]?.toLowerCase() || null;

    const params = {
      email,
      password,
      firstName: fname.trim(),
      lastName: lname.trim(),
      ...displayNameMaybe,
      publicData: {
        userType,
        emailDomain, // Store domain for institution matching
        ...pickUserFieldsData(rest, 'public', userType, userFields),
      },
      privateData: {
        ...pickUserFieldsData(rest, 'private', userType, userFields),
      },
      protectedData: {
        ...pickUserFieldsData(rest, 'protected', userType, userFields),
        ...getNonUserFieldParams(rest, userFields),
      },
    };

    submitSignup(params);
  };

  // Handle joining the waitlist
  const handleJoinWaitlist = async () => {
    if (!pendingSignupData) return;

    setWaitlistSubmitting(true);
    try {
      const baseUrl = apiBaseUrl();
      const response = await fetch(`${baseUrl}/api/student-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingSignupData.email,
          firstName: pendingSignupData.firstName,
          lastName: pendingSignupData.lastName,
        }),
      });

      if (response.ok) {
        setWaitlistSuccess(true);
      } else {
        throw new Error('Failed to join waitlist');
      }
    } catch (error) {
      console.error('Failed to join waitlist:', error);
      alert('Sorry, we could not add you to the waitlist. Please try again later.');
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  // Generate email to career services
  const getCareerServicesEmailLink = () => {
    if (!pendingSignupData) return '#';

    const subject = encodeURIComponent('Request AI Career Coaching from Street2Ivy');
    const body = encodeURIComponent(
      `Dear Career Services,\n\n` +
      `I recently discovered that Street2Ivy offers AI-powered career coaching for students, including resume reviews, interview practice, and career path guidance.\n\n` +
      `I believe this would be a valuable resource for our student body. Could you please look into partnering with Street2Ivy to make this feature available to us?\n\n` +
      `You can learn more at https://street2ivy.com\n\n` +
      `Thank you for your consideration.\n\n` +
      `Best regards,\n` +
      `${pendingSignupData.firstName} ${pendingSignupData.lastName}`
    );

    return `mailto:careerservices@${pendingSignupData.emailDomain}?subject=${subject}&body=${body}`;
  };

  const loginErrorMessage = (
    <div className={css.error}>
      <FormattedMessage id="AuthenticationPage.loginFailed" />
    </div>
  );

  const idpAuthErrorMessage = (
    <div className={css.error}>
      <FormattedMessage id="AuthenticationPage.idpAuthFailed" />
    </div>
  );

  const signupErrorMessage = (
    <div className={css.error}>
      {isSignupEmailTakenError(signupError) ? (
        <FormattedMessage id="AuthenticationPage.signupFailedEmailAlreadyTaken" />
      ) : (
        <FormattedMessage id="AuthenticationPage.signupFailed" />
      )}
    </div>
  );

  const eduEmailErrorMessage = eduEmailError ? (
    <div className={css.error}>
      {eduEmailError}
    </div>
  ) : null;

  const loginOrSignupError =
    isLogin && !!idpAuthError
      ? idpAuthErrorMessage
      : isLogin && !!loginError
      ? loginErrorMessage
      : !!eduEmailError
      ? eduEmailErrorMessage
      : !!signupError
      ? signupErrorMessage
      : null;

  const ariaLabel = `${intl.formatMessage({
    id: 'AuthenticationPage.signupLinkText',
  })} & ${intl.formatMessage({ id: 'AuthenticationPage.loginLinkText' })}`;

  return (
    <div className={css.content}>
      {isAdminPortal && (
        <div className={css.adminPortalBanner}>
          <FormattedMessage id="AuthenticationPage.adminPortalTitle" />
        </div>
      )}
      <LinkTabNavHorizontal className={css.tabs} tabs={tabs} ariaLabel={ariaLabel} />
      {loginOrSignupError}

      {/* Admin portal always shows login form (no signup) */}
      {isAdminPortal || isLogin ? (
        <LoginForm className={css.loginForm} onSubmit={submitLogin} inProgress={authInProgress} />
      ) : (
        <SignupForm
          className={css.signupForm}
          onSubmit={handleSubmitSignup}
          inProgress={authInProgress}
          termsAndConditions={termsAndConditions}
          preselectedUserType={preselectedUserType}
          userTypes={availableUserTypes}
          userFields={userFields}
        />
      )}

      {/* Hide social login on admin portal */}
      {!isAdminPortal && (
        <SocialLoginButtonsMaybe
          isLogin={isLogin}
          showFacebookLogin={showFacebookLogin}
          showGoogleLogin={showGoogleLogin}
          {...fromMaybe}
          {...userTypeMaybe}
        />
      )}

      {/* Show admin portal link on regular login/signup page */}
      {!isAdminPortal && (
        <div className={css.adminPortalLink}>
          <span className={css.adminPortalLinkText}>
            <FormattedMessage
              id="AuthenticationPage.adminPortalLinkText"
              values={{
                adminLink: (
                  <NamedLink name="AdminPortalLoginPage">
                    <FormattedMessage id="AuthenticationPage.adminPortalLinkLabel" />
                  </NamedLink>
                ),
              }}
            />
          </span>
        </div>
      )}

      {/* Institution Not Found Modal */}
      <Modal
        id="InstitutionNotFoundModal"
        isOpen={showInstitutionModal}
        onClose={() => {
          setShowInstitutionModal(false);
          setWaitlistSuccess(false);
        }}
        onManageDisableScrolling={() => {}}
        usePortal
      >
        <div className={css.institutionModal}>
          {waitlistSuccess ? (
            // Success state
            <div className={css.waitlistSuccess}>
              <span className={css.successIcon}>✅</span>
              <h2 className={css.modalTitle}>You're on the List!</h2>
              <p className={css.modalText}>
                We've added you to our waitlist. We'll notify you as soon as your school joins Street2Ivy.
              </p>
              <p className={css.modalText}>
                In the meantime, consider reaching out to your career services office to let them know you're interested!
              </p>
              <button
                className={css.modalPrimaryButton}
                onClick={() => {
                  setShowInstitutionModal(false);
                  setWaitlistSuccess(false);
                }}
              >
                Close
              </button>
            </div>
          ) : (
            // Initial state - institution not found
            <>
              <span className={css.modalIcon}>🎓</span>
              <h2 className={css.modalTitle}>Your School Hasn't Joined Street2Ivy Yet</h2>
              <p className={css.modalText}>
                We're not yet partnered with <strong>{pendingSignupData?.emailDomain}</strong>, but we'd love to be!
              </p>
              <p className={css.modalText}>
                The best way to make it happen? Let your career services office know there's demand. We'll take it from there.
              </p>

              <div className={css.modalActions}>
                <a
                  href={getCareerServicesEmailLink()}
                  className={css.modalPrimaryButton}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>📧</span>
                  Email Your Career Services
                </a>

                <button
                  className={css.modalSecondaryButton}
                  onClick={handleJoinWaitlist}
                  disabled={waitlistSubmitting}
                >
                  <span>📝</span>
                  {waitlistSubmitting ? 'Adding to Waitlist...' : 'Join the Waitlist'}
                </button>

                <button
                  className={css.modalCloseButton}
                  onClick={() => setShowInstitutionModal(false)}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

// Form for confirming information from IdP (e.g. Facebook)
// This is shown before new user is created to Marketplace API
const ConfirmIdProviderInfoForm = props => {
  const {
    userType,
    authInfo,
    authInProgress,
    confirmError,
    submitSingupWithIdp,
    termsAndConditions,
  } = props;
  const config = useConfiguration();
  const { userFields, userTypes } = config.user;
  const preselectedUserType = userTypes.find(conf => conf.userType === userType)?.userType || null;

  const idp = authInfo ? authInfo.idpId.replace(/^./, str => str.toUpperCase()) : null;

  const handleSubmitConfirm = values => {
    const { idpToken, email, firstName, lastName, idpId } = authInfo;

    const {
      userType,
      email: newEmail,
      firstName: newFirstName,
      lastName: newLastName,
      displayName,
      ...rest
    } = values;

    const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

    // Pass email, fistName or lastName to Marketplace API only if user has edited them
    // and they can't be fetched directly from idp provider (e.g. Facebook)

    const authParams = {
      ...(newEmail !== email && { email: newEmail }),
      ...(newFirstName !== firstName && { firstName: newFirstName }),
      ...(newLastName !== lastName && { lastName: newLastName }),
    };

    // Pass other values as extended data according to user field configuration
    const extendedDataMaybe = !isEmpty(rest)
      ? {
          publicData: {
            userType,
            ...pickUserFieldsData(rest, 'public', userType, userFields),
          },
          privateData: {
            ...pickUserFieldsData(rest, 'private', userType, userFields),
          },
          protectedData: {
            ...pickUserFieldsData(rest, 'protected', userType, userFields),
            // If the confirm form has any additional values, pass them forward as user's protected data
            ...getNonUserFieldParams(rest, userFields),
          },
        }
      : {};

    submitSingupWithIdp({
      idpToken,
      idpId,
      ...authParams,
      ...displayNameMaybe,
      ...extendedDataMaybe,
    });
  };

  const confirmErrorMessage = confirmError ? (
    <div className={css.error}>
      {isSignupEmailTakenError(confirmError) ? (
        <FormattedMessage id="AuthenticationPage.signupFailedEmailAlreadyTaken" />
      ) : (
        <FormattedMessage id="AuthenticationPage.signupFailed" />
      )}
    </div>
  ) : null;

  return (
    <div className={css.content}>
      <Heading as="h1" rootClassName={css.signupWithIdpTitle}>
        <FormattedMessage id="AuthenticationPage.confirmSignupWithIdpTitle" values={{ idp }} />
      </Heading>

      <p className={css.confirmInfoText}>
        <FormattedMessage id="AuthenticationPage.confirmSignupInfoText" />
      </p>
      {confirmErrorMessage}
      <ConfirmSignupForm
        className={css.form}
        onSubmit={handleSubmitConfirm}
        inProgress={authInProgress}
        termsAndConditions={termsAndConditions}
        authInfo={authInfo}
        idp={idp}
        preselectedUserType={preselectedUserType}
        userTypes={userTypes}
        userFields={userFields}
      />
    </div>
  );
};

export const AuthenticationOrConfirmInfoForm = props => {
  const {
    tab,
    userType,
    authInfo,
    from,
    showFacebookLogin,
    showGoogleLogin,
    submitLogin,
    submitSignup,
    submitSingupWithIdp,
    authInProgress,
    loginError,
    idpAuthError,
    signupError,
    confirmError,
    termsAndConditions,
    isAdminPortal,
  } = props;
  const isConfirm = tab === 'confirm';
  const isLogin = tab === 'login';

  return isConfirm ? (
    <ConfirmIdProviderInfoForm
      userType={userType}
      authInfo={authInfo}
      submitSingupWithIdp={submitSingupWithIdp}
      authInProgress={authInProgress}
      confirmError={confirmError}
      termsAndConditions={termsAndConditions}
    />
  ) : (
    <AuthenticationForms
      isLogin={isLogin}
      showFacebookLogin={showFacebookLogin}
      showGoogleLogin={showGoogleLogin}
      userType={userType}
      from={from}
      loginError={loginError}
      idpAuthError={idpAuthError}
      signupError={signupError}
      submitLogin={submitLogin}
      authInProgress={authInProgress}
      submitSignup={submitSignup}
      termsAndConditions={termsAndConditions}
      isAdminPortal={isAdminPortal}
    ></AuthenticationForms>
  );
};

const getAuthInfoFromCookies = () => {
  return Cookies.get('st-authinfo')
    ? JSON.parse(Cookies.get('st-authinfo').replace('j:', ''))
    : null;
};
const getAuthErrorFromCookies = () => {
  return Cookies.get('st-autherror')
    ? JSON.parse(Cookies.get('st-autherror').replace('j:', ''))
    : null;
};

const BlankPage = props => {
  const { schemaTitle, schemaDescription, scrollingDisabled, topbarClasses } = props;
  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <LayoutSingleColumn
        topbar={<TopbarContainer className={topbarClasses} />}
        footer={<FooterContainer />}
      >
        <div className={css.spinnerContainer}>
          <IconSpinner />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

/**
 * The AuthenticationPage component.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.authInProgress - Whether the authentication is in progress
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {propTypes.error} props.loginError - The login error
 * @param {propTypes.error} props.signupError - The signup error
 * @param {propTypes.error} props.confirmError - The confirm error
 * @param {Function} props.submitLogin - The login submit function
 * @param {Function} props.submitSignup - The signup submit function
 * @param {Function} props.submitSingupWithIdp - The signup with IdP submit function
 * @param {'login' | 'signup'| 'confirm'} props.tab - The tab to render
 * @param {boolean} props.sendVerificationEmailInProgress - Whether the verification email is in progress
 * @param {propTypes.error} props.sendVerificationEmailError - The verification email error
 * @param {Function} props.onResendVerificationEmail - The resend verification email function
 * @param {Function} props.onManageDisableScrolling - The manage disable scrolling function
 * @param {object} props.privacyAssetsData - The privacy assets data
 * @param {boolean} props.privacyFetchInProgress - Whether the privacy fetch is in progress
 * @param {propTypes.error} props.privacyFetchError - The privacy fetch error
 * @param {object} props.tosAssetsData - The terms of service assets data
 * @param {boolean} props.tosFetchInProgress - Whether the terms of service fetch is in progress
 * @param {propTypes.error} props.tosFetchError - The terms of service fetch error
 * @param {object} props.location - The location object
 * @param {object} props.params - The path parameters
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @returns {JSX.Element}
 */
export const AuthenticationPageComponent = props => {
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [authInfo, setAuthInfo] = useState(getAuthInfoFromCookies());
  const [authError, setAuthError] = useState(getAuthErrorFromCookies());
  const [mounted, setMounted] = useState(false);

  const config = useConfiguration();
  const intl = useIntl();

  useEffect(() => {
    // Remove the autherror cookie once the content is saved to state
    // because we don't want to show the error message e.g. after page refresh
    if (authError) {
      Cookies.remove('st-autherror');
    }
    setMounted(true);
  }, []);

  // On mobile, it's better to scroll to top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tosModalOpen, privacyModalOpen]);

  const {
    authInProgress,
    currentUser,
    isAuthenticated,
    location,
    params: pathParams,
    loginError,
    scrollingDisabled,
    signupError,
    submitLogin,
    submitSignup,
    confirmError,
    submitSingupWithIdp,
    tab = 'signup',
    isAdminPortal = false,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    onResendVerificationEmail,
    onManageDisableScrolling,
    tosAssetsData,
    tosFetchInProgress,
    tosFetchError,
  } = props;

  // History API has potentially state tied to this route
  // We have used that state to store previous URL ("from"),
  // so that use can be redirected back to that page after authentication.
  const locationFrom = location.state?.from || null;
  const authinfoFrom = authInfo?.from || null;
  const from = locationFrom || authinfoFrom || null;

  const isConfirm = tab === 'confirm';
  const userTypeInPushState = location.state?.userType || null;
  const userTypeInAuthInfo = isConfirm && authInfo?.userType ? authInfo?.userType : null;
  const userType = pathParams?.userType || userTypeInPushState || userTypeInAuthInfo || null;

  const { userTypes = [], adminUserTypes = [] } = config.user;
  // Use admin user types if on admin portal, otherwise use regular user types
  const availableUserTypes = isAdminPortal ? adminUserTypes : userTypes;
  const preselectedUserType =
    availableUserTypes.find(conf => conf.userType === userType)?.userType || null;
  const show404 = userType && !preselectedUserType;

  const user = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!user.id;
  const isLogin = tab === 'login';

  // We only want to show the email verification dialog in the signup
  // tab if the user isn't being redirected somewhere else
  // (i.e. `from` is present). We must also check the `emailVerified`
  // flag only when the current user is fully loaded.
  const showEmailVerification = !isLogin && currentUserLoaded && !user.attributes.emailVerified;

  const marketplaceName = config.marketplaceName;
  const schemaTitle = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.schemaTitleLogin' }, { marketplaceName })
    : intl.formatMessage({ id: 'AuthenticationPage.schemaTitleSignup' }, { marketplaceName });
  const schemaDescription = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.schemaDescriptionLogin' }, { marketplaceName })
    : intl.formatMessage({ id: 'AuthenticationPage.schemaDescriptionSignup' }, { marketplaceName });
  const topbarClasses = classNames({
    [css.hideOnMobile]: showEmailVerification,
  });

  // Street2Ivy: Get user type for role-based redirects
  const currentUserType = user.attributes?.profile?.publicData?.userType;
  const isAdminUser = currentUserType === 'system-admin' || currentUserType === 'educational-admin';

  // Street2Ivy: Admin users must use admin portal, regular users must use regular login
  const adminOnRegularLogin = isAuthenticated && currentUserLoaded && isAdminUser && !isAdminPortal;
  const regularUserOnAdminPortal = isAuthenticated && currentUserLoaded && !isAdminUser && isAdminPortal;

  const shouldRedirectToFrom = isAuthenticated && from;
  const shouldRedirectAfterLogin =
    isAuthenticated && currentUserLoaded && !showEmailVerification;

  // Determine where to redirect based on user type
  const getRedirectDestination = () => {
    if (currentUserType === 'system-admin') {
      return 'AdminDashboardPage';
    } else if (currentUserType === 'educational-admin') {
      return 'EducationDashboardPage';
    } else if (currentUserType === 'corporate-partner') {
      return 'CorporateDashboardPage';
    } else if (currentUserType === 'student') {
      return 'StudentDashboardPage';
    }
    return 'LandingPage';
  };

  if (!mounted && shouldRedirectAfterLogin) {
    // Show a blank page for already authenticated users,
    // when the first rendering on client side is not yet done
    // This is done to avoid hydration issues when full page load is happening.
    return (
      <BlankPage
        schemaTitle={schemaTitle}
        schemaDescription={schemaDescription}
        topbarClasses={topbarClasses}
      />
    );
  }

  // Street2Ivy: Redirect admin users to admin portal if they try to use regular login
  if (adminOnRegularLogin) {
    return <NamedRedirect name="AdminPortalLoginPage" />;
  }

  // Street2Ivy: Redirect regular users away from admin portal
  if (regularUserOnAdminPortal) {
    return <NamedRedirect name="LoginPage" />;
  }

  if (shouldRedirectToFrom) {
    // Already authenticated, redirect back to the page the user tried to access
    return <Redirect to={from} />;
  } else if (shouldRedirectAfterLogin) {
    // Street2Ivy: Redirect to appropriate dashboard based on user type
    return <NamedRedirect name={getRedirectDestination()} />;
  } else if (show404) {
    // User type not found, show 404
    return <NotFoundPage staticContext={props.staticContext} />;
  }

  const resendErrorTranslationId = isTooManyEmailVerificationRequestsError(
    sendVerificationEmailError
  )
    ? 'AuthenticationPage.resendFailedTooManyRequests'
    : 'AuthenticationPage.resendFailed';
  const resendErrorMessage = sendVerificationEmailError ? (
    <p className={css.error}>
      <FormattedMessage id={resendErrorTranslationId} />
    </p>
  ) : null;

  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer className={topbarClasses} />}
        footer={<FooterContainer />}
      >
        <ResponsiveBackgroundImageContainer
          className={css.root}
          childrenWrapperClassName={css.contentContainer}
          as="section"
          image={config.branding.brandImage}
          sizes="100%"
          useOverlay
        >
          {showEmailVerification ? (
            <EmailVerificationInfo
              name={user.attributes.profile.firstName}
              email={<span className={css.email}>{user.attributes.email}</span>}
              onResendVerificationEmail={onResendVerificationEmail}
              resendErrorMessage={resendErrorMessage}
              sendVerificationEmailInProgress={sendVerificationEmailInProgress}
            />
          ) : (
            <AuthenticationOrConfirmInfoForm
              tab={tab}
              userType={userType}
              authInfo={authInfo}
              from={from}
              showFacebookLogin={!!process.env.REACT_APP_FACEBOOK_APP_ID}
              showGoogleLogin={!!process.env.REACT_APP_GOOGLE_CLIENT_ID}
              submitLogin={submitLogin}
              submitSignup={submitSignup}
              submitSingupWithIdp={submitSingupWithIdp}
              authInProgress={authInProgress}
              loginError={loginError}
              idpAuthError={authError}
              signupError={signupError}
              confirmError={confirmError}
              isAdminPortal={isAdminPortal}
              termsAndConditions={
                <TermsAndConditions
                  onOpenTermsOfService={() => setTosModalOpen(true)}
                  onOpenPrivacyPolicy={() => setPrivacyModalOpen(true)}
                  intl={intl}
                />
              }
            />
          )}
        </ResponsiveBackgroundImageContainer>
      </LayoutSingleColumn>
      <Modal
        id="AuthenticationPage.tos"
        isOpen={tosModalOpen}
        onClose={() => setTosModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={'terms-accepted.tos-and-privacy'}
      >
        <div className={css.termsWrapper} role="complementary">
          <TermsOfServiceContent
            inProgress={tosFetchInProgress}
            error={tosFetchError}
            data={tosAssetsData?.[camelize(TOS_ASSET_NAME)]?.data}
          />
        </div>
      </Modal>
      <Modal
        id="AuthenticationPage.privacyPolicy"
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={'terms-accepted.tos-and-privacy'}
      >
        <div className={css.privacyWrapper} role="complementary">
          <PrivacyPolicyContent
            inProgress={tosFetchInProgress}
            error={tosFetchError}
            data={tosAssetsData?.[camelize(PRIVACY_POLICY_ASSET_NAME)]?.data}
          />
        </div>
      </Modal>
    </Page>
  );
};

const mapStateToProps = state => {
  const { isAuthenticated, loginError, signupError, confirmError } = state.auth;
  const { currentUser, sendVerificationEmailInProgress, sendVerificationEmailError } = state.user;
  const {
    pageAssetsData: privacyAssetsData,
    inProgress: privacyFetchInProgress,
    error: privacyFetchError,
  } = state.hostedAssets || {};
  const { pageAssetsData: tosAssetsData, inProgress: tosFetchInProgress, error: tosFetchError } =
    state.hostedAssets || {};

  return {
    authInProgress: authenticationInProgress(state),
    currentUser,
    isAuthenticated,
    loginError,
    scrollingDisabled: isScrollingDisabled(state),
    signupError,
    confirmError,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    privacyAssetsData,
    privacyFetchInProgress,
    privacyFetchError,
    tosAssetsData,
    tosFetchInProgress,
    tosFetchError,
  };
};

const mapDispatchToProps = dispatch => ({
  submitLogin: ({ email, password }) => dispatch(login(email, password)),
  submitSignup: params => dispatch(signup(params)),
  submitSingupWithIdp: params => dispatch(signupWithIdp(params)),
  onResendVerificationEmail: () => dispatch(sendVerificationEmail()),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const AuthenticationPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AuthenticationPageComponent);

export default AuthenticationPage;
