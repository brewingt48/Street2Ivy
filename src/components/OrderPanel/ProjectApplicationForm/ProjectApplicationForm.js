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
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleSkill = skill => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleFileSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
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

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.coverLetter || formData.coverLetter.trim().length < 20) {
      setError('Please write a cover letter with at least 20 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitProjectApplication({
        listingId,
        inviteId: inviteId || undefined,
        coverLetter: formData.coverLetter,
        resumeAttachmentId: resumeAttachmentId || undefined,
        availabilityDate: formData.availabilityDate || undefined,
        interestReason: formData.interestReason || undefined,
        skills: formData.skills.length > 0 ? formData.skills : undefined,
        relevantCoursework: formData.relevantCoursework || undefined,
        gpa: formData.gpa || undefined,
        hoursPerWeek: formData.hoursPerWeek ? parseInt(formData.hoursPerWeek, 10) : undefined,
        referencesText: formData.referencesText || undefined,
      });

      setSuccess(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(response);
      }
    } catch (submitErr) {
      console.error('Application submit failed:', submitErr);
      const msg = submitErr?.data?.error || submitErr?.message || 'Failed to submit application. Please try again.';
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
      <div className={css.success}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#10003;</div>
        <div>Application submitted successfully!</div>
        <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.8 }}>
          The company will review your application and respond soon.
        </div>
      </div>
    );
  }

  return (
    <form className={css.root} onSubmit={handleSubmit}>
      <h3 className={css.sectionTitle}>Apply for This Project</h3>

      {error && <div className={css.error}>{error}</div>}

      {/* Cover Letter */}
      <div className={css.fieldGroup}>
        <label className={css.label}>
          Cover Letter / Introduction <span className={css.required}>*</span>
        </label>
        <textarea
          className={css.textarea}
          placeholder="Introduce yourself and explain why you'd be a great fit for this project..."
          value={formData.coverLetter}
          onChange={e => handleChange('coverLetter', e.target.value)}
          maxLength={5000}
        />
        <span className={css.fieldHint}>Minimum 20 characters</span>
      </div>

      {/* Why Interested */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Why are you interested in this project?</label>
        <textarea
          className={css.textareaSmall}
          placeholder="What excites you about this project opportunity?"
          value={formData.interestReason}
          onChange={e => handleChange('interestReason', e.target.value)}
          maxLength={2000}
        />
      </div>

      {/* Resume Upload */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Resume / CV</label>
        {resumeFile ? (
          <div className={css.uploadedFile}>
            <span>&#128196;</span>
            <span className={css.uploadedFileName}>{resumeFile.name}</span>
            {isUploading ? (
              <span>Uploading...</span>
            ) : (
              <button type="button" className={css.removeFileButton} onClick={removeResume}>
                &#10005;
              </button>
            )}
          </div>
        ) : (
          <div
            className={css.uploadArea}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={css.uploadIcon}>&#128196;</div>
            <div className={css.uploadText}>
              Click to upload your resume (PDF, DOC, DOCX)
            </div>
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

      {/* Skills */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Relevant Skills</label>
        <div className={css.skillsGrid}>
          {SKILL_OPTIONS.map(skill => (
            <span
              key={skill}
              className={
                formData.skills.includes(skill) ? css.skillChipSelected : css.skillChip
              }
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Row: Availability Date + Hours Per Week */}
      <div className={css.fieldRow}>
        <div className={css.halfField}>
          <label className={css.label}>Availability Start Date</label>
          <input
            type="date"
            className={css.input}
            value={formData.availabilityDate}
            onChange={e => handleChange('availabilityDate', e.target.value)}
          />
        </div>
        <div className={css.halfField}>
          <label className={css.label}>Hours Available Per Week</label>
          <input
            type="number"
            className={css.numberInput}
            placeholder="e.g. 15"
            min="1"
            max="40"
            value={formData.hoursPerWeek}
            onChange={e => handleChange('hoursPerWeek', e.target.value)}
          />
        </div>
      </div>

      {/* Row: GPA + Relevant Coursework */}
      <div className={css.fieldRow}>
        <div className={css.halfField}>
          <label className={css.label}>GPA</label>
          <input
            type="text"
            className={css.input}
            placeholder="e.g. 3.7"
            value={formData.gpa}
            onChange={e => handleChange('gpa', e.target.value)}
          />
        </div>
        <div className={css.halfField}>
          <label className={css.label}>Relevant Coursework</label>
          <input
            type="text"
            className={css.input}
            placeholder="e.g. Statistics, Marketing 301"
            value={formData.relevantCoursework}
            onChange={e => handleChange('relevantCoursework', e.target.value)}
          />
        </div>
      </div>

      {/* References */}
      <div className={css.fieldGroup}>
        <label className={css.label}>References</label>
        <textarea
          className={css.textareaSmall}
          placeholder="List any references (name, title, contact info)"
          value={formData.referencesText}
          onChange={e => handleChange('referencesText', e.target.value)}
          maxLength={2000}
        />
      </div>

      {/* Submit */}
      <div className={css.submitSection}>
        <button
          type="submit"
          className={css.submitButton}
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
};

export default ProjectApplicationForm;
