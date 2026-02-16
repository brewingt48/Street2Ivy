/**
 * POST /api/admin/upload — Upload image or video to Cloudinary
 *
 * Admin-only endpoint. Accepts multipart FormData with:
 *   - file: File (image or video, max 10MB)
 *   - folder: string (optional, defaults to 'proveground')
 *
 * Returns the Cloudinary URL and metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { validateFileUpload } from '@/lib/security/file-upload';
import { uploadToCloudinary } from '@/lib/cloudinary';

// Force dynamic — no caching for upload endpoints
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check — admin only
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request. Expected multipart form data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Include a "file" field in the form data.' },
        { status: 400 }
      );
    }

    const folder = (formData.get('folder') as string) || 'proveground';

    // 3. Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Validate file (size, MIME type, magic bytes, extension)
    const validation = validateFileUpload(file.name, file.type, buffer, {
      maxSizeBytes: MAX_FILE_SIZE,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'File validation failed' },
        { status: 400 }
      );
    }

    // 5. Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      folder,
      resourceType: 'auto',
    });

    // 6. Return result
    return NextResponse.json({
      url: result.secureUrl,
      publicId: result.publicId,
      format: result.format,
      width: result.width,
      height: result.height,
      resourceType: result.resourceType,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';

    // Check for Cloudinary config errors specifically
    if (message.includes('environment variables')) {
      return NextResponse.json(
        { error: 'File upload is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
