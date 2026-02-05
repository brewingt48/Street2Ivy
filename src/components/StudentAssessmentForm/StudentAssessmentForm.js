import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { fetchAssessmentCriteria, submitAssessment } from '../../util/api';

import css from './StudentAssessmentForm.module.css';

const RATING_LABELS = {
  1: 'Below Expectations',
  2: 'Needs Improvement',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
};

const RatingInput = ({ criterionKey, label, description, value, onChange }) => {
  return (
    <div className={css.criterionRow}>
      <div className={css.criterionInfo}>
        <span className={css.criterionLabel}>{label}</span>
        {description && <span className={css.criterionDescription}>{description}</span>}
      </div>
      <div className={css.ratingButtons}>
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            className={classNames(css.ratingButton, {
              [css.ratingButtonSelected]: value === rating,
              [css.rating1]: rating === 1 && value === rating,
              [css.rating2]: rating === 2 && value === rating,
              [css.rating3]: rating === 3 && value === rating,
              [css.rating4]: rating === 4 && value === rating,
              [css.rating5]: rating === 5 && value === rating,
            })}
            onClick={() => onChange(criterionKey, rating)}
            title={RATING_LABELS[rating]}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
};

const StudentAssessmentForm = props => {
  const {
    transactionId,
    studentId,
    studentName,
    projectTitle,
    onSuccess,
    onCancel,
  } = props;

  const intl = useIntl();
  const [criteria, setCriteria] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [overallComments, setOverallComments] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [recommendForFuture, setRecommendForFuture] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchAssessmentCriteria()
      .then(response => {
        setCriteria(response.criteria);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load assessment criteria');
        setLoading(false);
      });
  }, []);

  const handleRatingChange = (criterionKey, rating) => {
    setRatings(prev => ({ ...prev, [criterionKey]: rating }));
  };

  const handleCommentChange = (criterionKey, comment) => {
    setComments(prev => ({ ...prev, [criterionKey]: comment }));
  };

  const validateForm = () => {
    if (!criteria) return false;

    // Check that all required criteria have ratings
    const allCriteriaKeys = Object.values(criteria).flatMap(section =>
      section.criteria.map(c => c.key)
    );

    const missingRatings = allCriteriaKeys.filter(key => !ratings[key]);
    if (missingRatings.length > 0) {
      setError(`Please provide ratings for all criteria. Missing: ${missingRatings.length} ratings.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const response = await submitAssessment({
        transactionId,
        studentId,
        ratings,
        comments,
        overallComments,
        strengths,
        areasForImprovement,
        recommendForFuture,
      });

      setSuccessMessage('Assessment submitted successfully! The student has been notified.');

      if (onSuccess) {
        setTimeout(() => onSuccess(response), 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={css.loading}>Loading assessment form...</div>;
  }

  if (successMessage) {
    return (
      <div className={css.successContainer}>
        <div className={css.successIcon}>✓</div>
        <h3 className={css.successTitle}>Assessment Submitted</h3>
        <p className={css.successMessage}>{successMessage}</p>
      </div>
    );
  }

  return (
    <form className={css.root} onSubmit={handleSubmit}>
      <div className={css.header}>
        <h2 className={css.title}>Student Performance Assessment</h2>
        <p className={css.subtitle}>Company Mentor Evaluation Form</p>
      </div>

      <div className={css.purposeBox}>
        <h4 className={css.purposeTitle}>Purpose</h4>
        <p className={css.purposeText}>
          This assessment helps students understand their performance, guides their professional
          development, and contributes to their Street2Ivy track record. As AI automation eliminates
          traditional entry-level positions, your feedback is essential to helping students develop
          the sophisticated skills employers now require. Please provide honest, constructive feedback.
        </p>
      </div>

      {/* Project Information */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Project Information</h3>
        <div className={css.projectInfo}>
          <div className={css.infoRow}>
            <span className={css.infoLabel}>Student Name:</span>
            <span className={css.infoValue}>{studentName}</span>
          </div>
          <div className={css.infoRow}>
            <span className={css.infoLabel}>Project Title:</span>
            <span className={css.infoValue}>{projectTitle}</span>
          </div>
        </div>
      </div>

      {/* Rating Scale Legend */}
      <div className={css.ratingScaleLegend}>
        <h4 className={css.legendTitle}>Rating Scale</h4>
        <div className={css.legendItems}>
          {Object.entries(RATING_LABELS).map(([rating, label]) => (
            <span key={rating} className={css.legendItem}>
              <strong>{rating}</strong> = {label}
            </span>
          ))}
        </div>
      </div>

      {error && <div className={css.error}>{error}</div>}

      {/* Criteria Sections */}
      {criteria &&
        Object.entries(criteria).map(([sectionKey, section]) => (
          <div key={sectionKey} className={css.section}>
            <h3 className={css.sectionTitle}>{section.title}</h3>
            <div className={css.criteriaTable}>
              <div className={css.tableHeader}>
                <span className={css.headerCriteria}>Criteria</span>
                <span className={css.headerRatings}>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </span>
              </div>
              {section.criteria.map(criterion => (
                <RatingInput
                  key={criterion.key}
                  criterionKey={criterion.key}
                  label={criterion.label}
                  description={criterion.description}
                  value={ratings[criterion.key]}
                  onChange={handleRatingChange}
                />
              ))}
            </div>
          </div>
        ))}

      {/* Additional Feedback Section */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Additional Feedback</h3>

        <div className={css.textAreaGroup}>
          <label className={css.textAreaLabel}>Key Strengths</label>
          <textarea
            className={css.textArea}
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
            placeholder="What did the student do particularly well?"
            rows={3}
          />
        </div>

        <div className={css.textAreaGroup}>
          <label className={css.textAreaLabel}>Areas for Improvement</label>
          <textarea
            className={css.textArea}
            value={areasForImprovement}
            onChange={e => setAreasForImprovement(e.target.value)}
            placeholder="What skills or behaviors could the student develop further?"
            rows={3}
          />
        </div>

        <div className={css.textAreaGroup}>
          <label className={css.textAreaLabel}>Overall Comments</label>
          <textarea
            className={css.textArea}
            value={overallComments}
            onChange={e => setOverallComments(e.target.value)}
            placeholder="Any additional feedback for the student..."
            rows={4}
          />
        </div>

        <div className={css.checkboxGroup}>
          <label className={css.checkboxLabel}>
            <input
              type="checkbox"
              checked={recommendForFuture}
              onChange={e => setRecommendForFuture(e.target.checked)}
              className={css.checkbox}
            />
            <span>I would recommend this student for future projects</span>
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className={css.actions}>
        {onCancel && (
          <button type="button" className={css.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className={css.submitButton} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </div>
    </form>
  );
};

export default StudentAssessmentForm;
