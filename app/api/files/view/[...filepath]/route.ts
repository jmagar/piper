import { NextRequest, NextResponse } from 'next/server';
import { appLogger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

// This should ideally be from a shared util or the same as in message-processing.ts
const getContentTypeFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'md') return 'text/markdown';
  // Add more common types as needed
  return 'application/octet-stream'; // Default binary stream
};

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
// Resolve UPLOADS_DIR to an absolute path for security checks
const ABSOLUTE_UPLOADS_DIR = path.resolve(UPLOADS_DIR);

export async function GET(
  request: NextRequest,
  context: { params: { filepath: string[] } }
) {
  if (!context.params.filepath || context.params.filepath.length === 0) {
    return new NextResponse('Filepath cannot be empty', { status: 400 });
  }

  const relativeFilePath = context.params.filepath.join('/');
  const fileName = context.params.filepath[context.params.filepath.length - 1];

  // Construct the absolute path to the requested file
  const requestedAbsolutePath = path.resolve(ABSOLUTE_UPLOADS_DIR, relativeFilePath);

  // Security Check: Ensure the resolved path is still within the UPLOADS_DIR
  if (!requestedAbsolutePath.startsWith(ABSOLUTE_UPLOADS_DIR + path.sep) && requestedAbsolutePath !== ABSOLUTE_UPLOADS_DIR) {
    console.warn(`[FileViewAPI] Directory traversal attempt blocked: ${relativeFilePath} (resolved: ${requestedAbsolutePath})`);
    return new NextResponse('Forbidden: Access denied.', { status: 403 });
  }

  try {
    // Check if file exists and is a file
    const stats = await fs.stat(requestedAbsolutePath);
    if (!stats.isFile()) {
      return new NextResponse('Not a file', { status: 400 });
    }

    const fileBuffer = await fs.readFile(requestedAbsolutePath);
    const contentType = getContentTypeFromPath(relativeFilePath);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    // Optional: Suggest to browser how to display file, helps for direct browser access
    // For images, 'inline' is usually fine. For other types, 'attachment' might be preferred.
    headers.set('Content-Disposition', `inline; filename="${fileName}"`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    });

  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      appLogger.withContext({ source: 'FileViewAPI' }).info(`File not found: ${relativeFilePath}`);
      return new NextResponse('File not found', { status: 404 });
    } else {
      appLogger.withContext({ source: 'FileViewAPI' }).error(`Error serving file ${relativeFilePath}:`, error instanceof Error ? error : new Error(String(error)));
      return new NextResponse('Internal server error', { status: 500 });
    }
  }
}
