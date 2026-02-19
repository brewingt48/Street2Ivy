import React, { useState, useRef } from 'react';
import { useIntl } from '../../../util/reactIntl';
import { apiBaseUrl, submitProjectApplication, uploadAttachment } from '../../../util/api';

import css from './ProjectApplicationForm.module.css';

const SKILL_OPTIONS = [
  'Data Analysis',
  'Market Research',
  'Financial Modeling',
  'Project Management',
  'Social Media',
  'Content Writing',
  'Graphic Design',
  'UX/UI Design',
  'Web Development',
  'Mobile Development',
  'Python',
  'Excel / Sheets',
  'SQL / Databases',
  'Machine Learning',
  'Strategic Planning',
  'Public Speaking',
  'Sales / Business Dev',
  'Video Editing',
  'Event Planning',
  'Legal Research',
];

const ProjectApplicationForm = props => {
  const { listingId, inviteId, onSubmitSuccess, isOwnListing } = props;
  const intl = useIntl();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    coverLetter: '',
    availabilityDate: '',
    interestReason: '',
    skills: [],
    relevantCoursework: '',
    gpa: '',
    hoursPerWeek: '',
    referencesText: '',
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeAttachmentId, setResumeAttachmentId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleSkill = skill => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
    if (fieldErrors.skills) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.skills;
        return next;
      });
    }
  };

  const handleFileSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setError('Please upload a PDF, DOC, or DOCX file for your resume.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Resume file must be under 10MB.');
      return;
    }

    setResumeFile(file);
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadAttachment(file, 'application-resume', 'pending');
      if (result.success && result.attachment) {
        setResumeAttachmentId(result.attachment.id);
      } else {
        setError('Failed to upload resume. Please try again.');
        setResumeFile(null);
      }
    } catch (uploadErr) {
      console.error('Resume upload failed:', uploadErr);
      setError('Failed to upload resume. Please try again.');
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeAttachmentId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.coverLetter || formData.coverLetter.trim().length < 20) {
      errors.coverLetter = 'Cover letter must be at least 20 characters.';
    }
    if (!formData.interestReason || formData.interestReason.trim().length < 10) {
      errors.interestReason = 'Please explain why you are interested (at least 10 characters).';
    }
    if (formData.skills.length === 0) {
      errors.skills = 'Please select at least one relevant skill.';
    }
    if (!formData.availabilityDate) {
      errors.availabilityDate = 'Please select your earliest availability date.';
    }
    if (!formData.hoursPerWeek || parseInt(formData.hoursPerWeek, 10) < 1) {
      errors.hoursPerWeek = 'Please enter hours available per week.';
    }
    if (!formData.relevantCoursework || formData.relevantCoursework.trim().length < 3) {
      errors.relevantCoursework = 'Please list relevant coursework.';
    }
    if (!formData.referencesText || formData.referencesText.trim().length < 5) {
      errors.referencesText = 'Please provide at least one reference.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Please complete all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitProjectApplication({
        listingId,
        inviteId: inviteId || undefined,
        coverLetter: formData.coverLetter.trim(),
        resumeAttachmentId: resumeAttachmentId || undefined,
        availabilityDate: formData.availabilityDate,
        interestReason: formData.interestReason.trim(),
        skills: formData.skills,
        relevantCoursework: formData.relevantCoursework.trim(),
        gpa: formData.gpa.trim() || undefined,
        hoursPerWeek: parseInt(formData.hoursPerWeek, 10),
        referencesText: formData.referencesText.trim(),
      });

      setSuccess(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(response);
      }
    } catch (submitErr) {
      console.error('Application submit failed:', submitErr);
      const msg =
        submitErr?.data?.error ||
        submitErr?.message ||
        'Failed to submit application. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOwnListing) {
    return null;
  }

  if (success) {
    return (
      <div className={css.successPanel}>
        <div className={css.successIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#059669" fillOpacity="0.1" />
            <circle cx="24" cy="24" r="18" fill="#059669" fillOpacity="0.15" />
            <path d="M16 24L22 30L34 18" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className={css.successTitle}>Application Submitted</h3>
        <p className={css.successMessage}>
          Your application has been sent to the project team. They will review it and respond soon.
          You can track the status of your application from your dashboard.
        </p>
      </div>
    );
  }

  return (
    <form className={css.root} onSubmit={handleSubmit}>
      {/* Header */}
      <div className={css.formHeader}>
        <h3 className={css.formTitle}>Project Application</h3>
        <p className={css.formSubtitle}>
          Complete the form below to apply. Fields marked with <span className={css.requiredStar}>*</span> are required.
        </p>
      </div>

      {error && (
        <div className={css.errorBanner}>
          <svg className={css.errorBannerIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Cover Letter */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>1</span>
          <div>
            <label className={css.sectionLabel}>
              Cover Letter <span className={css.requiredStar}>*</span>
            </label>
            <p className={css.sectionHint}>
              Introduce yourself and explain why you would be a great fit for this project.
            </p>
          </div>
        </div>
        <textarea
          className={`${css.textarea} ${fieldErrors.coverLetter ? css.inputError : ''}`}
          placeholder="Dear hiring team, I am writing to express my strong interest in this project..."
          value={formData.coverLetter}
          onChange={e => handleChange('coverLetter', e.target.value)}
          maxLength={5000}
          rows={6}
        />
        <div className={css.fieldFooter}>
          {fieldErrors.coverLetter && (
            <span className={css.fieldErrorText}>{fieldErrors.coverLetter}</span>
          )}
          <span className={css.charCount}>
            {formData.coverLetter.length}/5,000
          </span>
        </div>
      </div>

      {/* Section 2: Why Interested */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>2</span>
          <div>
            <label className={css.sectionLabel}>
              Why are you interested? <span className={css.requiredStar}>*</span>
            </label>
            <p className={css.sectionHint}>
              What excites you about this specific project and how does it align with your goals?
            </p>
          </div>
        </div>
        <textarea
          className={`${css.textareaSmall} ${fieldErrors.interestReason ? css.inputError : ''}`}
          placeholder="This project excites me because..."
          value={formData.interestReason}
          onChange={e => handleChange('interestReason', e.target.value)}
          maxLength={2000}
          rows={3}
        />
        {fieldErrors.interestReason && (
          <span className={css.fieldErrorText}>{fieldErrors.interestReason}</span>
        )}
      </div>

      {/* Section 3: Skills */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>3</span>
          <div>
            <label className={css.sectionLabel}>
              Relevant Skills <span className={css.requiredStar}>*</span>
            </label>
            <p className={css.sectionHint}>
              Select all skills relevant to this project.
              {formData.skills.length > 0 && (
                <span className={css.skillCount}> ({formData.skills.length} selected)</span>
              )}
            </p>
          </div>
        </div>
        <div className={`${css.skillsGrid} ${fieldErrors.skills ? css.skillsGridError : ''}`}>
          {SKILL_OPTIONS.map(skill => (
            <button
              key={skill}
              type="button"
              className={formData.skills.includes(skill) ? css.skillChipSelected : css.skillChip}
              onClick={() => toggleSkill(skill)}
            >
              {formData.skills.includes(skill) && (
                <svg className={css.skillCheckIcon} width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {skill}
            </button>
          ))}
        </div>
        {fieldErrors.skills && (
          <span className={css.fieldErrorText}>{fieldErrors.skills}</span>
        )}
      </div>

      {/* Section 4: Resume Upload (Optional) */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>4</span>
          <div>
            <label className={css.sectionLabel}>Resume / CV</label>
            <p className={css.sectionHint}>Optional. Upload a PDF, DOC, or DOCX file (max 10MB).</p>
          </div>
        </div>
        {resumeFile ? (
          <div className={css.uploadedFile}>
            <div className={css.uploadedFileIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M11 1H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7l-6-6z" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 1v6h6" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={css.uploadedFileInfo}>
              <span className={css.uploadedFileName}>{resumeFile.name}</span>
              <span className={css.uploadedFileSize}>
                {isUploading ? 'Uploading...' : `${(resumeFile.size / 1024).toFixed(0)} KB`}
              </span>
            </div>
            {!isUploading && (
              <button type="button" className={css.removeFileButton} onClick={removeResume}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div
            className={css.uploadArea}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <svg className={css.uploadIcon} width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 20V8m0 0l-4 4m4-4l4 4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 20v4a2 2 0 002 2h16a2 2 0 002-2v-4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={css.uploadLabel}>Click to upload resume</span>
            <span className={css.uploadFormats}>PDF, DOC, or DOCX</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Section 5: Availability & Hours */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>5</span>
          <div>
            <label className={css.sectionLabel}>
              Availability <span className={css.requiredStar}>*</span>
            </label>
            <p className={css.sectionHint}>When can you start and how many hours per week are you available?</p>
          </div>
        </div>
        <div className={css.fieldRow}>
          <div className={css.halfField}>
            <label className={css.fieldLabel}>Start Date <span className={css.requiredStar}>*</span></label>
            <input
              type="date"
              className={`${css.input} ${fieldErrors.availabilityDate ? css.inputError : ''}`}
              value={formData.availabilityDate}
              onChange={e => handleChange('availabilityDate', e.target.value)}
            />
            {fieldErrors.availabilityDate && (
              <span className={css.fieldErrorText}>{fieldErrors.availabilityDate}</span>
            )}
          </div>
          <div className={css.halfField}>
            <label className={css.fieldLabel}>Hours Per Week <span className={css.requiredStar}>*</span></label>
            <input
              type="number"
              className={`${css.input} ${fieldErrors.hoursPerWeek ? css.inputError : ''}`}
              placeholder="e.g. 15"
              min="1"
              max="40"
              value={formData.hoursPerWeek}
              onChange={e => handleChange('hoursPerWeek', e.target.value)}
            />
            {fieldErrors.hoursPerWeek && (
              <span className={css.fieldErrorText}>{fieldErrors.hoursPerWeek}</span>
            )}
          </div>
        </div>
      </div>

      {/* Section 6: Academic Info */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>6</span>
          <div>
            <label className={css.sectionLabel}>Academic Background</label>
            <p className={css.sectionHint}>Share your academic details to strengthen your application.</p>
          </div>
        </div>
        <div className={css.fieldRow}>
          <div className={css.halfField}>
            <label className={css.fieldLabel}>GPA <span className={css.optionalTag}>(Optional)</span></label>
            <input
              type="text"
              className={css.input}
              placeholder="e.g. 3.7"
              value={formData.gpa}
              onChange={e => handleChange('gpa', e.target.value)}
            />
          </div>
          <div className={css.halfField}>
            <label className={css.fieldLabel}>Relevant Coursework <span className={css.requiredStar}>*</span></label>
            <input
              type="text"
              className={`${css.input} ${fieldErrors.relevantCoursework ? css.inputError : ''}`}
              placeholder="e.g. Statistics, Marketing 301, Data Science"
              value={formData.relevantCoursework}
              onChange={e => handleChange('relevantCoursework', e.target.value)}
            />
            {fieldErrors.relevantCoursework && (
              <span className={css.fieldErrorText}>{fieldErrors.relevantCoursework}</span>
            )}
          </div>
        </div>
      </div>

      {/* Section 7: References */}
      <div className={css.formSection}>
        <div className={css.sectionHeader}>
          <span className={css.sectionNumber}>7</span>
          <div>
            <label className={css.sectionLabel}>
              References <span className={css.requiredStar}>*</span>
            </label>
            <p className={css.sectionHint}>
              Provide at least one professional or academic reference with their contact information.
            </p>
          </div>
        </div>
        <textarea
          className={`${css.textareaSmall} ${fieldErrors.referencesText ? css.inputError : ''}`}
          placeholder="Professor Jane Smith, Marketing Department, jsmith@university.edu, (555) 123-4567"
          value={formData.referencesText}
          onChange={e => handleChange('referencesText', e.target.value)}
          maxLength={2000}
          rows={3}
        />
        {fieldErrors.referencesText && (
          <span className={css.fieldErrorText}>{fieldErrors.referencesText}</span>
        )}
      </div>

      {/* Submit */}
      <div className={css.submitSection}>
        <button
          type="submit"
          className={css.submitButton}
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? (
            <>
              <span className={css.submitSpinner} />
              Submitting Application...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
        <p className={css.submitDisclaimer}>
          By submitting, you confirm all information provided is accurate.
        </p>
      </div>
    </form>
  );
};

export default ProjectApplicationForm;
