const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB (increased from 10MB as per PRD)

// Allow any file type as per PRD requirements
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

  // No file type restrictions as per PRD - allow any file type
  return { isValid: true }
}

export async function uploadFile(file: File, chatId: string): Promise<Attachment> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('chatId', chatId)

  try {
    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }

    const result = await response.json()
    
    console.log(`✅ File uploaded: ${file.name} (${file.size} bytes)`)
    
    return result.attachment
  } catch (error) {
    console.error(`❌ Error uploading file ${file.name}:`, error)
    throw new Error(`Error uploading file: ${error}`)
  }
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: file.name,
    contentType: file.type,
    url,
  }
}

export async function processFiles(
  files: File[],
  chatId: string
): Promise<Attachment[]> {
  const attachments: Attachment[] = []

  for (const file of files) {
    const validation = await validateFile(file)
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error)
      continue
    }

    try {
      const attachment = await uploadFile(file, chatId)
      attachments.push(attachment)
      
      console.log(`✅ File processed and stored: ${file.name}`)
    } catch (error) {
      console.error(`❌ Error processing file ${file.name}:`, error)
    }
  }

  return attachments
}

// No upload limits in admin-only mode
export async function checkFileUploadLimit(): Promise<number> {
  // Admin has no limits
  return 0
} 