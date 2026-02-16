'use client';

/**
 * Reusable File Upload Component
 *
 * Drag-and-drop zone + click-to-browse for uploading images and videos.
 * Uploads to Cloudinary via POST /api/admin/upload and returns the URL
 * to the parent via the onUpload callback.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { csrfFetch } from '@/lib/security/csrf-fetch';

interface FileUploadProps {
  /** Callback when upload completes — receives the Cloudinary URL */
  onUpload: (url: string, metadata?: { format: string; width: number; height: number; resourceType: string }) => void;
  /** Accepted MIME types (e.g. 'image/*,video/*') */
  accept?: string;
  /** Maximum file size in MB (default: 10) */
  maxSizeMB?: number;
  /** Cloudinary folder (default: 'proveground') */
  folder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function FileUpload({
  onUpload,
  accept = 'image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime',
  maxSizeMB = 10,
  folder = 'proveground',
  className = '',
  disabled = false,
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const resetState = useCallback(() => {
    setState('idle');
    setError(null);
    setPreview(null);
    setPreviewType(null);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // Reset previous state
    setError(null);
    setPreview(null);
    setPreviewType(null);

    // Client-side validation
    if (file.size > maxSizeBytes) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      setState('error');
      return;
    }

    // Show local preview while uploading
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (isImage || isVideo) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setPreviewType(isVideo ? 'video' : 'image');
    }

    // Upload to server
    setState('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await csrfFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(data.error || `Upload failed (${response.status})`);
      }

      const data = await response.json();
      setState('success');

      // Update preview to the Cloudinary URL
      if (data.url) {
        setPreview(data.url);
        setPreviewType(data.resourceType === 'video' ? 'video' : 'image');
      }

      // Notify parent with the Cloudinary URL
      onUpload(data.url, {
        format: data.format,
        width: data.width,
        height: data.height,
        resourceType: data.resourceType,
      });

      // Auto-reset after success
      setTimeout(() => {
        resetState();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setState('error');
    }
  }, [maxSizeBytes, maxSizeMB, folder, onUpload, resetState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled && state !== 'uploading') {
      fileInputRef.current?.click();
    }
  }, [disabled, state]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || state === 'uploading'}
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-2 p-6
          border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-200
          ${isDragOver
            ? 'border-teal-500 bg-teal-50'
            : state === 'error'
              ? 'border-red-300 bg-red-50'
              : state === 'success'
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Preview */}
        {preview && previewType === 'image' && (
          <div className="relative w-full max-w-[200px] mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Upload preview"
              className="w-full h-auto rounded-md object-cover max-h-[120px]"
            />
            {state !== 'uploading' && (
              <button
                onClick={(e) => { e.stopPropagation(); resetState(); }}
                className="absolute -top-2 -right-2 p-0.5 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {preview && previewType === 'video' && (
          <div className="relative w-full max-w-[200px] mb-2">
            <video
              src={preview}
              className="w-full h-auto rounded-md max-h-[120px]"
              muted
              playsInline
            />
            {state !== 'uploading' && (
              <button
                onClick={(e) => { e.stopPropagation(); resetState(); }}
                className="absolute -top-2 -right-2 p-0.5 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* State indicators */}
        {state === 'uploading' && (
          <>
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm text-teal-700 font-medium">Uploading…</p>
          </>
        )}

        {state === 'success' && !preview && (
          <>
            <CheckCircle className="w-8 h-8 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Upload complete!</p>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={(e) => { e.stopPropagation(); resetState(); }}
              className="text-xs text-red-500 underline hover:text-red-700"
            >
              Try again
            </button>
          </>
        )}

        {state === 'idle' && !preview && (
          <>
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                Drop a file here or <span className="text-teal-600 underline">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Images (PNG, JPEG, GIF, WebP) or Videos (MP4, WebM, MOV) • Max {maxSizeMB}MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
