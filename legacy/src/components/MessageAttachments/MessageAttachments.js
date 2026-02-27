import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import { uploadAttachment } from '../../util/api';

import css from './MessageAttachments.module.css';

// File type icons
const FILE_TYPE_ICONS = {
  pdf: '📄',
  document: '📝',
  spreadsheet: '📊',
  presentation: '📽️',
  image: '🖼️',
  file: '📎',
};

// Allowed file types
const ALLOWED_TYPES = [
  '.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.doc', '.xls', '.ppt'
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Blocked extensions
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.ps1', '.msi', '.jar', '.js', '.vbs'];

/**
 * Get file extension from filename
 */
const getFileExtension = filename => {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
};

/**
 * Get file type category
 */
const getFileTypeCategory = filename => {
  const ext = getFileExtension(filename);
  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'document';
  if (['.xls', '.xlsx'].includes(ext)) return 'spreadsheet';
  if (['.ppt', '.pptx'].includes(ext)) return 'presentation';
  if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) return 'image';
  return 'file';
};

/**
 * Format file size
 */
const formatFileSize = bytes => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Validate file
 */
const validateFile = file => {
  const ext = getFileExtension(file.name);

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type ${ext} is not allowed for security reasons` };
  }

  // Check allowed extensions
  if (!ALLOWED_TYPES.includes(ext)) {
    return {
      valid: false,
      error: `File type ${ext} is not supported. Allowed types: PDF, Word, Excel, PowerPoint, and images`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds the 10MB limit` };
  }

  return { valid: true };
};

/**
 * AttachmentPreview - Shows a pending attachment before sending
 */
const AttachmentPreview = ({ file, onRemove }) => {
  const fileType = getFileTypeCategory(file.name);
  const icon = FILE_TYPE_ICONS[fileType] || FILE_TYPE_ICONS.file;

  return (
    <div className={css.attachmentPreview}>
      {fileType === 'image' ? (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className={css.imagePreview}
        />
      ) : (
        <span className={css.fileIcon}>{icon}</span>
      )}
      <div className={css.fileInfo}>
        <span className={css.fileName}>{file.name}</span>
        <span className={css.fileSize}>{formatFileSize(file.size)}</span>
      </div>
      <button
        type="button"
        className={css.removeButton}
        onClick={() => onRemove(file)}
        aria-label="Remove attachment"
      >
        ×
      </button>
    </div>
  );
};

/**
 * AttachmentDisplay - Shows a sent/received attachment
 */
export const AttachmentDisplay = ({ attachment, className }) => {
  const { name, sizeFormatted, fileType, url, previewUrl } = attachment;
  const icon = FILE_TYPE_ICONS[fileType] || FILE_TYPE_ICONS.file;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(css.attachmentDisplay, className)}
      download
    >
      {fileType === 'image' && previewUrl ? (
        <img src={previewUrl} alt={name} className={css.thumbnailPreview} />
      ) : (
        <span className={css.displayIcon}>{icon}</span>
      )}
      <div className={css.displayInfo}>
        <span className={css.displayName}>{name}</span>
        <span className={css.displaySize}>{sizeFormatted}</span>
      </div>
      <span className={css.downloadIcon}>⬇️</span>
    </a>
  );
};

/**
 * MessageAttachments - Main component for handling message attachments
 */
const MessageAttachments = props => {
  const {
    contextType,
    contextId,
    onAttachmentsChange,
    pendingAttachments = [],
    disabled = false,
    className,
  } = props;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleAttachClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async event => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setError(null);
    setUploading(true);

    const newAttachments = [...pendingAttachments];

    for (const file of files) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error);
        continue;
      }

      // Add to pending with local preview
      const localAttachment = {
        id: `local-${Date.now()}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        fileType: getFileTypeCategory(file.name),
        isUploading: true,
        isLocal: true,
      };

      newAttachments.push(localAttachment);
    }

    onAttachmentsChange(newAttachments);
    setUploading(false);

    // Clear file input
    event.target.value = '';
  };

  const handleRemoveAttachment = fileToRemove => {
    const updated = pendingAttachments.filter(a =>
      a.isLocal ? a.file !== fileToRemove : a.id !== fileToRemove.id
    );
    onAttachmentsChange(updated);
  };

  return (
    <div className={classNames(css.root, className)}>
      {/* Attach button */}
      <button
        type="button"
        className={classNames(css.attachButton, { [css.disabled]: disabled || uploading })}
        onClick={handleAttachClick}
        disabled={disabled || uploading}
        title="Attach files (PDF, Word, Excel, PowerPoint, images)"
      >
        <span className={css.attachIcon}>📎</span>
        {uploading && <span className={css.uploadingText}>...</span>}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className={css.hiddenInput}
        onChange={handleFileSelect}
        accept={ALLOWED_TYPES.join(',')}
        multiple
      />

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className={css.pendingAttachments}>
          {pendingAttachments.map((attachment, index) => (
            <AttachmentPreview
              key={attachment.id || index}
              file={attachment.isLocal ? attachment.file : attachment}
              onRemove={handleRemoveAttachment}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={css.errorMessage}>
          <span className={css.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {/* Allowed types hint */}
      <div className={css.allowedTypesHint}>
        <FormattedMessage
          id="MessageAttachments.allowedTypes"
          defaultMessage="PDF, Word, Excel, PowerPoint, images (max 10MB)"
        />
      </div>
    </div>
  );
};

MessageAttachments.propTypes = {
  contextType: PropTypes.string.isRequired,
  contextId: PropTypes.string.isRequired,
  onAttachmentsChange: PropTypes.func.isRequired,
  pendingAttachments: PropTypes.array,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default MessageAttachments;
