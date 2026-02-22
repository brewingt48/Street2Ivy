'use client';

/**
 * Media Upload Field — Reusable URL + File Upload Combo
 *
 * Combines a URL text input with a FileUpload drop zone, separated by
 * an "— or —" divider. When a file is uploaded, the Cloudinary URL
 * is set as the value. The admin can also paste a URL directly.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/ui/file-upload';

interface MediaUploadFieldProps {
  /** Field label */
  label: string;
  /** Current URL value */
  value: string;
  /** Called when URL changes (typed or from upload) */
  onChange: (url: string) => void;
  /** Accepted MIME types for upload */
  accept?: string;
  /** Cloudinary folder */
  folder?: string;
  /** Upload API endpoint */
  uploadUrl?: string;
  /** URL input placeholder */
  placeholder?: string;
  /** Help text below the field */
  helpText?: string;
  /** Description for the upload zone */
  uploadDescription?: string;
}

export function MediaUploadField({
  label,
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/gif,image/webp',
  folder = 'proveground/huddle',
  uploadUrl = '/api/education/upload',
  placeholder = 'https://example.com/media.jpg',
  helpText,
  uploadDescription,
}: MediaUploadFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>

      {/* File Upload Zone */}
      <FileUpload
        onUpload={(url) => onChange(url)}
        accept={accept}
        folder={folder}
        uploadUrl={uploadUrl}
        maxSizeMB={10}
        description={uploadDescription}
      />

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
        <span className="px-3 text-xs text-slate-400 bg-white dark:bg-slate-900">or paste a URL</span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      </div>

      {/* URL Input */}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm"
      />

      {helpText && (
        <p className="text-xs text-slate-400">{helpText}</p>
      )}
    </div>
  );
}
