/**
 * Cloudinary Upload Utility
 *
 * Server-side helper for uploading images and videos to Cloudinary.
 * Uses upload_stream to pipe directly from memory (no temp files),
 * which is required on Heroku's ephemeral filesystem.
 *
 * Environment variables required:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  resourceType: string;
  bytes: number;
}

export interface UploadOptions {
  /** Cloudinary folder path (e.g. 'proveground/hero') */
  folder?: string;
  /** Resource type — 'image', 'video', or 'auto' (default: 'auto') */
  resourceType?: 'image' | 'video' | 'auto';
  /** Optional public ID (otherwise Cloudinary generates one) */
  publicId?: string;
}

/**
 * Upload a buffer to Cloudinary using upload_stream.
 * Returns the Cloudinary URL and metadata.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder = 'proveground', resourceType = 'auto' } = options;

  // Verify Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not configured');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...(options.publicId ? { public_id: options.publicId } : {}),
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          resourceType: result.resource_type,
          bytes: result.bytes,
        });
      }
    );

    // Write the buffer to the upload stream
    uploadStream.end(buffer);
  });
}

/**
 * Delete a resource from Cloudinary by public ID.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
