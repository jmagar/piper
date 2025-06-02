const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Attachment type for AI SDK compatibility
export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  // No file type restrictions - allow any file type
  return { isValid: true }
}

// AI SDK Pattern: Files are now handled directly by the AI SDK
// No need for pre-upload processing