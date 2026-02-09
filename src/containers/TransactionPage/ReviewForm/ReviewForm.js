import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isTransactionsTransitionAlreadyReviewed } from '../../../util/errors';
import { propTypes } from '../../../util/types';
import { required } from '../../../util/validators';
import { getReviewCategories } from '../../../util/structuredReview';

import { FieldReviewRating, Form, PrimaryButton, FieldTextInput } from '../../../components';

import css from './ReviewForm.module.css';

/**
 * A single category rating row with label and star rating input.
 */
const CategoryRatingField = ({ category, formId, intl }) => {
  const label = intl.formatMessage({ id: category.labelId });
  const requiredMsg = intl.formatMessage({ id: 'ReviewForm.categoryRatingRequired' });
  const fieldId = formId ? `${formId}.category_${category.key}` : `category_${category.key}`;

  return (
    <div className={css.categoryRatingRow}>
      <FieldReviewRating
        className={css.categoryRating}
        id={fieldId}
        name={`categoryRatings.${category.key}`}
        label={label}
        validate={required(requiredMsg)}
      />
    </div>
  );
};

/**
 * Structured Review form for Street2Ivy.
 *
 * Shows multiple category-specific star ratings plus a text area.
 * The reviewer role determines which categories are shown:
 * - Students (customers) rate: Communication, Mentorship, Project Clarity, Professionalism
 * - Corporate partners (providers) rate: Work Quality, Communication, Reliability, Initiative
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {string} props.formId
 * @param {Function} props.onSubmit
 * @param {boolean} props.reviewSent
 * @param {propTypes.error} props.sendReviewError
 * @param {boolean} props.sendReviewInProgress
 * @param {string} props.reviewerRole - 'customer' or 'provider'
 */
const ReviewForm = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        className,
        rootClassName,
        disabled,
        handleSubmit,
        formId,
        invalid,
        reviewSent,
        sendReviewError,
        sendReviewInProgress,
        reviewerRole,
      } = fieldRenderProps;
      const intl = useIntl();

      const categories = getReviewCategories(reviewerRole || 'customer');

      const reviewContent = intl.formatMessage({ id: 'ReviewForm.reviewContentLabel' });
      const reviewContentPlaceholderMessage = intl.formatMessage({
        id: 'ReviewForm.reviewContentPlaceholder',
      });
      const reviewContentRequiredMessage = intl.formatMessage({
        id: 'ReviewForm.reviewContentRequired',
      });

      const errorMessage = isTransactionsTransitionAlreadyReviewed(sendReviewError) ? (
        <p className={css.error}>
          <FormattedMessage id="ReviewForm.reviewSubmitAlreadySent" />
        </p>
      ) : (
        <p className={css.error}>
          <FormattedMessage id="ReviewForm.reviewSubmitFailed" />
        </p>
      );
      const errorArea = sendReviewError ? errorMessage : <p className={css.errorPlaceholder} />;

      const reviewSubmitMessage = intl.formatMessage({
        id: 'ReviewForm.reviewSubmit',
      });

      const classes = classNames(rootClassName || css.root, className);
      const submitInProgress = sendReviewInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          {/* Structured Category Ratings */}
          <div className={css.categoryRatingsSection}>
            <h4 className={css.categoryRatingsTitle}>
              <FormattedMessage id="ReviewForm.categoryRatingsTitle" />
            </h4>
            <p className={css.categoryRatingsSubtitle}>
              <FormattedMessage id="ReviewForm.categoryRatingsSubtitle" />
            </p>
            {categories.map(category => (
              <CategoryRatingField
                key={category.key}
                category={category}
                formId={formId}
                intl={intl}
              />
            ))}
          </div>

          {/* Written Review */}
          <FieldTextInput
            className={css.reviewContent}
            type="textarea"
            id={formId ? `${formId}.reviewContent` : 'reviewContent'}
            name="reviewContent"
            label={reviewContent}
            placeholder={reviewContentPlaceholderMessage}
            validate={required(reviewContentRequiredMessage)}
          />

          {errorArea}
          <PrimaryButton
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={reviewSent}
          >
            {reviewSubmitMessage}
          </PrimaryButton>
        </Form>
      );
    }}
  />
);

export default ReviewForm;
