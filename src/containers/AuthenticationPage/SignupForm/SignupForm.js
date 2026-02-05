import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form as FinalForm, FormSpy } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';

import { Form, PrimaryButton, FieldTextInput, CustomExtendedDataField } from '../../../components';

import FieldSelectUserType from '../FieldSelectUserType';
import UserFieldDisplayName from '../UserFieldDisplayName';
import UserFieldPhoneNumber from '../UserFieldPhoneNumber';

import css from './SignupForm.module.css';

const getSoleUserTypeMaybe = userTypes =>
  Array.isArray(userTypes) && userTypes.length === 1 ? userTypes[0].userType : null;

const isPasswordUsedMoreThanOnce = formValues => {
  const pw = formValues.password;
  const hasPasswordString = pw != null && pw.length >= validators.PASSWORD_MIN_LENGTH;

  if (hasPasswordString) {
    const isPasswordRepeated = Object.values(formValues).filter(v => v === pw).length > 1;
    return isPasswordRepeated;
  }
  return false;
};

/**
 * Check if the email domain is a valid .edu domain
 */
const isEduEmail = email => {
  if (!email) return false;
  const domain = email.split('@')[1];
  if (!domain) return false;
  // Accept .edu domains and common educational domains
  return domain.endsWith('.edu') || domain.endsWith('.edu.au') || domain.endsWith('.ac.uk');
};

/**
 * Extract domain from email
 */
const getDomainFromEmail = email => {
  if (!email) return null;
  const domain = email.split('@')[1];
  return domain ? domain.toLowerCase() : null;
};

/**
 * Institution Membership Checker Component
 * Shows real-time status of institution membership while user types email
 */
const InstitutionChecker = ({ email, userType, intl, onStatusChange }) => {
  const [status, setStatus] = useState({ checking: false, isMember: null, message: null });
  const lastCheckedDomain = useRef(null);

  useEffect(() => {
    // Only check for students
    if (userType !== 'student') {
      if (status.isMember !== true) {
        setStatus({ checking: false, isMember: true, message: null });
        onStatusChange(true);
      }
      return;
    }

    // Validate email format first
    if (!email || !email.includes('@')) {
      if (status.isMember !== null || status.message !== null) {
        setStatus({ checking: false, isMember: null, message: null });
        onStatusChange(null);
      }
      return;
    }

    const domain = getDomainFromEmail(email);
    if (!domain) {
      if (status.isMember !== null || status.message !== null) {
        setStatus({ checking: false, isMember: null, message: null });
        onStatusChange(null);
      }
      return;
    }

    // Check if it's a .edu email
    if (!isEduEmail(email)) {
      const errorMsg = intl.formatMessage({ id: 'SignupForm.eduEmailRequired' });
      if (status.isMember !== false || status.message !== errorMsg) {
        setStatus({
          checking: false,
          isMember: false,
          message: errorMsg,
        });
        onStatusChange(false);
      }
      return;
    }

    // Skip if we already checked this domain
    if (lastCheckedDomain.current === domain && !status.checking) {
      return;
    }

    // Check institution membership
    const checkMembership = async () => {
      lastCheckedDomain.current = domain;
      setStatus(prev => ({ ...prev, checking: true, message: intl.formatMessage({ id: 'SignupForm.checkingInstitution' }) }));

      try {
        const response = await fetch(`/api/institutions/check/${encodeURIComponent(domain)}`);
        const data = await response.json();

        if (data.isMember) {
          setStatus({
            checking: false,
            isMember: true,
            message: `✓ ${data.institutionName || domain} is a member of Street2Ivy`,
          });
          onStatusChange(true);
        } else {
          setStatus({
            checking: false,
            isMember: false,
            message: intl.formatMessage(
              { id: 'SignupForm.institutionNotMember' },
              { domain }
            ),
          });
          onStatusChange(false);
        }
      } catch (error) {
        console.error('Failed to check institution membership:', error);
        // On error, allow signup but warn
        setStatus({
          checking: false,
          isMember: true,
          message: null,
        });
        onStatusChange(true);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(checkMembership, 500);
    return () => clearTimeout(timeoutId);
  }, [email, userType, intl]); // Removed onStatusChange from deps to prevent loops

  if (!status.message) return null;

  return (
    <div
      className={classNames(css.institutionStatus, {
        [css.institutionStatusChecking]: status.checking,
        [css.institutionStatusValid]: status.isMember === true,
        [css.institutionStatusInvalid]: status.isMember === false,
      })}
    >
      {status.checking && <span className={css.spinner}></span>}
      {status.message}
    </div>
  );
};

/**
 * Wrapper component to handle institution validation state
 */
const SignupFormWithInstitutionCheck = props => {
  const {
    rootClassName,
    className,
    formId,
    handleSubmit,
    inProgress,
    invalid,
    intl,
    termsAndConditions,
    preselectedUserType,
    userTypes,
    userFields,
    values,
  } = props;

  const { userType, email } = values || {};
  const [institutionValid, setInstitutionValid] = useState(null);

  // Memoize the callback to prevent unnecessary re-renders
  const handleInstitutionStatusChange = useCallback((isValid) => {
    setInstitutionValid(isValid);
  }, []);

  // email
  const emailRequired = validators.required(
    intl.formatMessage({
      id: 'SignupForm.emailRequired',
    })
  );
  const emailValid = validators.emailFormatValid(
    intl.formatMessage({
      id: 'SignupForm.emailInvalid',
    })
  );

  // Custom validation for .edu email for students
  const eduEmailValidator = (value, allValues) => {
    if (allValues.userType === 'student' && value && !isEduEmail(value)) {
      return intl.formatMessage({ id: 'SignupForm.eduEmailRequired' });
    }
    return undefined;
  };

  // password
  const passwordRequiredMessage = intl.formatMessage({
    id: 'SignupForm.passwordRequired',
  });
  const passwordMinLengthMessage = intl.formatMessage(
    {
      id: 'SignupForm.passwordTooShort',
    },
    {
      minLength: validators.PASSWORD_MIN_LENGTH,
    }
  );
  const passwordMaxLengthMessage = intl.formatMessage(
    {
      id: 'SignupForm.passwordTooLong',
    },
    {
      maxLength: validators.PASSWORD_MAX_LENGTH,
    }
  );
  const passwordMinLength = validators.minLength(
    passwordMinLengthMessage,
    validators.PASSWORD_MIN_LENGTH
  );
  const passwordMaxLength = validators.maxLength(
    passwordMaxLengthMessage,
    validators.PASSWORD_MAX_LENGTH
  );
  const passwordRequired = validators.requiredStringNoTrim(passwordRequiredMessage);
  const passwordValidators = validators.composeValidators(
    passwordRequired,
    passwordMinLength,
    passwordMaxLength
  );

  // Custom user fields. Since user types are not supported here,
  // only fields with no user type id limitation are selected.
  const userFieldProps = getPropsForCustomUserFieldInputs(userFields, intl, userType);

  const noUserTypes = !userType && !(userTypes?.length > 0);
  const userTypeConfig = userTypes.find(config => config.userType === userType);
  const showDefaultUserFields = userType || noUserTypes;
  const showCustomUserFields = (userType || noUserTypes) && userFieldProps?.length > 0;

  const classes = classNames(rootClassName || css.root, className);
  const submitInProgress = inProgress;

  // Disable submit if:
  // 1. Form is invalid
  // 2. Form is submitting
  // 3. Password is repeated in other fields
  // 4. For students: institution is not a member (institutionValid === false)
  const institutionBlocked = userType === 'student' && institutionValid === false;
  const submitDisabled = invalid || submitInProgress || isPasswordUsedMoreThanOnce(values) || institutionBlocked;

  return (
    <Form className={classes} onSubmit={handleSubmit}>
      <FieldSelectUserType
        name="userType"
        userTypes={userTypes}
        hasExistingUserType={!!preselectedUserType}
        intl={intl}
      />

      {showDefaultUserFields ? (
        <div className={css.defaultUserFields}>
          <FieldTextInput
            type="email"
            id={formId ? `${formId}.email` : 'email'}
            name="email"
            autoComplete="email"
            label={intl.formatMessage({
              id: 'SignupForm.emailLabel',
            })}
            placeholder={
              userType === 'student'
                ? intl.formatMessage({ id: 'SignupForm.emailPlaceholderStudent' }, { defaultMessage: 'your.name@university.edu' })
                : intl.formatMessage({ id: 'SignupForm.emailPlaceholder' })
            }
            validate={validators.composeValidators(emailRequired, emailValid, eduEmailValidator)}
          />

          {/* Institution membership checker for students */}
          {userType === 'student' && (
            <InstitutionChecker
              email={email}
              userType={userType}
              intl={intl}
              onStatusChange={handleInstitutionStatusChange}
            />
          )}

          <div className={css.name}>
            <FieldTextInput
              className={css.firstNameRoot}
              type="text"
              id={formId ? `${formId}.fname` : 'fname'}
              name="fname"
              autoComplete="given-name"
              label={intl.formatMessage({
                id: 'SignupForm.firstNameLabel',
              })}
              placeholder={intl.formatMessage({
                id: 'SignupForm.firstNamePlaceholder',
              })}
              validate={validators.required(
                intl.formatMessage({
                  id: 'SignupForm.firstNameRequired',
                })
              )}
            />
            <FieldTextInput
              className={css.lastNameRoot}
              type="text"
              id={formId ? `${formId}.lname` : 'lname'}
              name="lname"
              autoComplete="family-name"
              label={intl.formatMessage({
                id: 'SignupForm.lastNameLabel',
              })}
              placeholder={intl.formatMessage({
                id: 'SignupForm.lastNamePlaceholder',
              })}
              validate={validators.required(
                intl.formatMessage({
                  id: 'SignupForm.lastNameRequired',
                })
              )}
            />
          </div>

          <UserFieldDisplayName
            formName="SignupForm"
            className={css.row}
            userTypeConfig={userTypeConfig}
            intl={intl}
          />

          <FieldTextInput
            className={css.password}
            type="password"
            id={formId ? `${formId}.password` : 'password'}
            name="password"
            autoComplete="new-password"
            label={intl.formatMessage({
              id: 'SignupForm.passwordLabel',
            })}
            placeholder={intl.formatMessage({
              id: 'SignupForm.passwordPlaceholder',
            })}
            validate={passwordValidators}
          />

          <UserFieldPhoneNumber
            formName="SignupForm"
            className={css.row}
            userTypeConfig={userTypeConfig}
            intl={intl}
          />
        </div>
      ) : null}

      {showCustomUserFields ? (
        <div className={css.customFields}>
          {userFieldProps.map(({ key, ...fieldProps }) => (
            <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
          ))}
        </div>
      ) : null}

      <div className={css.bottomWrapper}>
        {termsAndConditions}
        {isPasswordUsedMoreThanOnce(values) ? (
          <div className={css.error}>
            <FormattedMessage id="SignupForm.passwordRepeatedOnOtherFields" />
          </div>
        ) : null}
        {institutionBlocked && (
          <div className={css.error}>
            <FormattedMessage id="SignupForm.institutionNotMember" values={{ domain: getDomainFromEmail(email) || 'your institution' }} />
          </div>
        )}
        <PrimaryButton type="submit" inProgress={submitInProgress} disabled={submitDisabled}>
          <FormattedMessage id="SignupForm.signUp" />
        </PrimaryButton>
      </div>
    </Form>
  );
};

const SignupFormComponent = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    initialValues={{ userType: props.preselectedUserType || getSoleUserTypeMaybe(props.userTypes) }}
    render={formRenderProps => (
      <SignupFormWithInstitutionCheck {...formRenderProps} {...props} />
    )}
  />
);

/**
 * A component that renders the signup form.
 *
 * @component
 * @param {Object} props
 * @param {string} props.rootClassName - The root class name that overrides the default class css.root
 * @param {string} props.className - The class that extends the root class
 * @param {string} props.formId - The form id
 * @param {boolean} props.inProgress - Whether the form is in progress
 * @param {ReactNode} props.termsAndConditions - The terms and conditions
 * @param {string} props.preselectedUserType - The preselected user type
 * @param {propTypes.userTypes} props.userTypes - The user types
 * @param {propTypes.listingFields} props.userFields - The user fields
 * @returns {JSX.Element}
 */
const SignupForm = props => {
  const intl = useIntl();
  return <SignupFormComponent {...props} intl={intl} />;
};

export default SignupForm;
