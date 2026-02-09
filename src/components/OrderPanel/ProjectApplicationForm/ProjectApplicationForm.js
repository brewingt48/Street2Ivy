import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { required } from '../../../util/validators';

import { Form, PrimaryButton, FieldTextInput } from '../..';

import css from './ProjectApplicationForm.module.css';

const renderForm = formRenderProps => {
  const {
    formId,
    className,
    rootClassName,
    handleSubmit,
    isOwnListing,
    invalid,
    submitting,
    finePrintComponent: FinePrint,
    intl,
  } = formRenderProps;
  const classes = classNames(rootClassName || css.root, className);

  const interestLabel = intl.formatMessage({ id: 'ProjectApplicationForm.interestLabel' });
  const interestPlaceholder = intl.formatMessage({
    id: 'ProjectApplicationForm.interestPlaceholder',
  });
  const interestRequired = required(
    intl.formatMessage({ id: 'ProjectApplicationForm.interestRequired' })
  );

  const experienceLabel = intl.formatMessage({ id: 'ProjectApplicationForm.experienceLabel' });
  const experiencePlaceholder = intl.formatMessage({
    id: 'ProjectApplicationForm.experiencePlaceholder',
  });
  const experienceRequired = required(
    intl.formatMessage({ id: 'ProjectApplicationForm.experienceRequired' })
  );

  const availabilityLabel = intl.formatMessage({ id: 'ProjectApplicationForm.availabilityLabel' });
  const availabilityPlaceholder = intl.formatMessage({
    id: 'ProjectApplicationForm.availabilityPlaceholder',
  });
  const availabilityRequired = required(
    intl.formatMessage({ id: 'ProjectApplicationForm.availabilityRequired' })
  );

  const hoursLabel = intl.formatMessage({ id: 'ProjectApplicationForm.hoursLabel' });
  const hoursPlaceholder = intl.formatMessage({ id: 'ProjectApplicationForm.hoursPlaceholder' });

  const notesLabel = intl.formatMessage({ id: 'ProjectApplicationForm.notesLabel' });
  const notesPlaceholder = intl.formatMessage({ id: 'ProjectApplicationForm.notesPlaceholder' });

  return (
    <Form id={formId} onSubmit={handleSubmit} className={classes}>
      <h3 className={css.heading}>
        <FormattedMessage id="ProjectApplicationForm.heading" />
      </h3>

      <FieldTextInput
        id={`${formId}.interest`}
        name="interest"
        className={css.field}
        type="textarea"
        label={interestLabel}
        placeholder={interestPlaceholder}
        validate={interestRequired}
      />

      <FieldTextInput
        id={`${formId}.experience`}
        name="experience"
        className={css.field}
        type="textarea"
        label={experienceLabel}
        placeholder={experiencePlaceholder}
        validate={experienceRequired}
      />

      <FieldTextInput
        id={`${formId}.availability`}
        name="availability"
        className={css.field}
        type="text"
        label={availabilityLabel}
        placeholder={availabilityPlaceholder}
        validate={availabilityRequired}
      />

      <FieldTextInput
        id={`${formId}.hoursPerWeek`}
        name="hoursPerWeek"
        className={css.field}
        type="text"
        label={hoursLabel}
        placeholder={hoursPlaceholder}
      />

      <FieldTextInput
        id={`${formId}.additionalNotes`}
        name="additionalNotes"
        className={css.field}
        type="textarea"
        label={notesLabel}
        placeholder={notesPlaceholder}
      />

      <div className={css.submitButton}>
        <PrimaryButton type="submit" disabled={invalid || submitting}>
          <FormattedMessage id="ProjectApplicationForm.ctaButton" />
        </PrimaryButton>
        <FinePrint isOwnListing={isOwnListing} omitYouWontBeChargedMessage={true} />
      </div>
    </Form>
  );
};

/**
 * A form for applying to a project listing.
 * Collects interest, experience, availability, hours, and notes.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} props.formId - The ID of the form
 * @param {Function} props.onSubmit - The function to handle the form submission
 * @param {boolean} props.isOwnListing - Whether the current user owns the listing
 * @returns {JSX.Element}
 */
const ProjectApplicationForm = props => {
  const intl = useIntl();
  const initialValues = {};

  return <FinalForm initialValues={initialValues} {...props} intl={intl} render={renderForm} />;
};

export default ProjectApplicationForm;
