import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';


// Resolve the base directory for uploads. This should be an absolute path.
// Use environment variable UPLOADS_DIR, defaulting to './uploads' if not set.
const configuredUploadsDir = process.env.UPLOADS_DIR || './uploads';
const UPLOADS_BASE_DIR = path.resolve(configuredUploadsDir);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const relativePathInput = searchParams.get('path') || '';

  // Normalize the user-provided relative path. This helps clean up '..', '.', and multiple slashes.
  // However, path.normalize alone doesn't prevent escaping the base directory if not careful.
  const normalizedClientPath = path.normalize(relativePathInput);

  // Prevent access to paths starting with '..' directly from client input after normalization.
  if (normalizedClientPath.startsWith('..')) {
    return NextResponse.json({ error: 'Access denied: Invalid path.' }, { status: 403 });
  }

  const targetPath = path.join(UPLOADS_BASE_DIR, normalizedClientPath);

  // Security Check: Ensure the resolved targetPath is still within UPLOADS_BASE_DIR.
  const relativeCheck = path.relative(UPLOADS_BASE_DIR, targetPath);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
    // If relativeCheck starts with '..' or is an absolute path, it means targetPath is outside UPLOADS_BASE_DIR.
    return NextResponse.json({ error: 'Access denied: Path is outside the allowed directory.' }, { status: 403 });
  }

  try {
    const statsForTargetPath = await fs.stat(targetPath);
    if (!statsForTargetPath.isDirectory()) {
      return NextResponse.json({ error: 'Specified path is not a directory.' }, { status: 400 });
    }

    const dirents = await fs.readdir(targetPath, { withFileTypes: true });
    const items = await Promise.all(
      dirents.map(async (dirent) => {
        const itemFullPath = path.join(targetPath, dirent.name);
        try {
          const stats = await fs.stat(itemFullPath);
          return {
            name: dirent.name,
            type: dirent.isDirectory() ? 'directory' : 'file',
            size: dirent.isFile() ? stats.size : undefined,
            lastModified: stats.mtime.toISOString(),
            // Path for client-side navigation, relative to UPLOADS_BASE_DIR
            relativePath: path.join(normalizedClientPath, dirent.name),
          };
        } catch (itemError: any) {
          console.error(`Error stating item ${itemFullPath}: ${itemError.message}`);
          return {
            name: dirent.name,
            type: 'inaccessible',
            relativePath: path.join(normalizedClientPath, dirent.name),
            error: itemError.message,
          };
        }
      })
    );

    return NextResponse.json({
      path: normalizedClientPath, // The current relative path being listed
      items,
    });

  } catch (error: any) {
    console.error(`API files/list error for path "${targetPath}": ${error.message}`);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: `Path not found: /${normalizedClientPath}`.replace('//','/') }, { status: 404 });
    }
    if (error.code === 'EACCES') {
      return NextResponse.json({ error: `Permission denied for: /${normalizedClientPath}`.replace('//','/') }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to list directory contents.' }, { status: 500 });
  }
}
