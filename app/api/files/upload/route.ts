import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

// Resolve the base directory for uploads. This should be an absolute path.
const configuredUploadsDir = process.env.UPLOADS_DIR || './uploads';
const UPLOADS_BASE_DIR = path.resolve(configuredUploadsDir);

const MAX_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const destinationPathInput = formData.get('destinationPath') as string || ''; // Relative path from UPLOADS_BASE_DIR

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.` }, { status: 413 }); // 413 Payload Too Large
    }

    // Sanitize and resolve the destination path
    const normalizedDestinationPath = path.normalize(destinationPathInput);
    if (normalizedDestinationPath.startsWith('..')) {
      return NextResponse.json({ error: 'Access denied: Invalid destination path.' }, { status: 403 });
    }

    const targetDirectory = path.join(UPLOADS_BASE_DIR, normalizedDestinationPath);
    const relativeCheckDir = path.relative(UPLOADS_BASE_DIR, targetDirectory);
    if (relativeCheckDir.startsWith('..') || path.isAbsolute(relativeCheckDir)) {
      return NextResponse.json({ error: 'Access denied: Destination path is outside the allowed directory.' }, { status: 403 });
    }
    
    // Ensure the target directory exists
    try {
      await fs.mkdir(targetDirectory, { recursive: true });
    } catch (mkdirError: any) {
      console.error(`Error creating directory ${targetDirectory}: ${mkdirError.message}`);
      return NextResponse.json({ error: 'Failed to create destination directory.' }, { status: 500 });
    }

    const targetFilePath = path.join(targetDirectory, file.name);
    const relativeCheckFile = path.relative(UPLOADS_BASE_DIR, targetFilePath);
     if (relativeCheckFile.startsWith('..') || path.isAbsolute(relativeCheckFile)) {
      return NextResponse.json({ error: 'Access denied: Final file path is outside the allowed directory.' }, { status: 403 });
    }

    // Check if file already exists (optional, can be decided based on desired behavior)
    // For now, we will overwrite if it exists.

    const bytes = await file.arrayBuffer();
    await fs.writeFile(targetFilePath, Buffer.from(bytes));

    return NextResponse.json({
      message: 'File uploaded successfully.',
      filePath: path.join(normalizedDestinationPath, file.name),
      fileName: file.name,
      size: file.size,
    }, { status: 201 });

  } catch (error: any) {
    console.error(`API files/upload error: ${error.message}`);
    if (error.name === 'PayloadTooLargeError') { // Check if error is due to payload size (might be caught by server before this handler)
        return NextResponse.json({ error: `File size exceeds the server limit.` }, { status: 413 });
    }
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
