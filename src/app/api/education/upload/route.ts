/**
 * POST /api/education/upload — Upload image, video, or PDF to Cloudinary
 *
 * Education admin endpoint. Accepts multipart FormData with:
 *   - file: File (image, video, or PDF, max 10MB)
 *   - folder: string (optional, defaults to 'proveground/huddle')
 *
 * Feature-gated: requires teamHuddle feature.
 * Returns the Cloudinary URL and metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { validateFileUpload } from '@/lib/security/file-upload';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check — educational_admin or admin
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    // 2. Feature gate — require teamHuddle
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    // 3. Parse FormData
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

    // Default folder scoped to tenant
    const folderBase = (formData.get('folder') as string) || 'proveground/huddle';
    const folder = tenantId ? `${folderBase}/${tenantId}` : folderBase;

    // 4. Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Validate file (size, MIME type, magic bytes, extension)
    const validation = validateFileUpload(file.name, file.type, buffer, {
      maxSizeBytes: MAX_FILE_SIZE,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'File validation failed' },
        { status: 400 }
      );
    }

    // 6. Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      folder,
      resourceType: 'auto',
    });

    // 7. Return result
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
    console.error('Education upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';

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
