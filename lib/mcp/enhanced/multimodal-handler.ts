import { fileTypeFromBuffer } from "file-type"
import { createHash } from "crypto"
import { promises as fsPromises } from "fs";
import { join, extname } from "path"
import {
  MultiModalContent,
  ImageContent,
  FileContent,
  AudioContent,
  VideoContent,
  DataContent
} from './types'

/**
 * Multi-modal content handler for processing and serving rich content
 */
export class MultiModalContentHandler {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
    // Video
    'video/mp4', 'video/webm', 'video/ogg',
    // Data formats
    'application/json', 'text/csv', 'text/xml', 'application/xml',
    // Text
    'text/plain', 'text/html', 'text/markdown'
  ])

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly UPLOAD_DIR = process.env.UPLOADS_DIR || './uploads'

  static async detectMimeType(content: Buffer | Uint8Array | string): Promise<string | null> {
    try {
      if (typeof content === 'string') {
        // Try to detect from content string
        if (content.startsWith('data:')) {
          const match = content.match(/^data:([^;]+);/)
          return match?.[1] || null
        }
        
        // Default to text for string content
        return 'text/plain'
      }

      const buffer = content instanceof Uint8Array ? Buffer.from(content) : content as Buffer
      const fileType = await fileTypeFromBuffer(buffer)
      return fileType?.mime || null
    } catch (error) {
      console.error('[Multi-Modal] MIME type detection failed:', error)
      return null
    }
  }

  static validateContent(content: MultiModalContent): { valid: boolean; error?: string } {
    // Check MIME type
    if (content.mimeType && !this.ALLOWED_MIME_TYPES.has(content.mimeType)) {
      return { valid: false, error: `Unsupported MIME type: ${content.mimeType}` }
    }

    // Check content size
    let contentSize = 0
    if (typeof content.content === 'string') {
      contentSize = Buffer.byteLength(content.content, 'utf8')
    } else if (Buffer.isBuffer(content.content)) {
      contentSize = content.content.length
    } else if (content.content instanceof Uint8Array) {
      contentSize = content.content.length
    }

    if (contentSize > this.MAX_FILE_SIZE) {
      return { valid: false, error: `Content size ${contentSize} exceeds limit ${this.MAX_FILE_SIZE}` }
    }

    // Type-specific validation
    switch (content.type) {
      case 'image':
        return this.validateImageContent(content as ImageContent)
      case 'file':
        return this.validateFileContent(content as FileContent)
      case 'audio':
        return this.validateAudioContent(content as AudioContent)
      case 'video':
        return this.validateVideoContent(content as VideoContent)
      case 'data':
        return this.validateDataContent(content as DataContent)
      default:
        return { valid: true }
    }
  }

  private static validateImageContent(content: ImageContent): { valid: boolean; error?: string } {
    const validImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (content.mimeType && !validImageMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid image MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  private static validateFileContent(content: FileContent): { valid: boolean; error?: string } {
    if (!content.metadata?.filename) {
      return { valid: false, error: 'File content must include filename in metadata' }
    }
    return { valid: true }
  }

  private static validateAudioContent(content: AudioContent): { valid: boolean; error?: string } {
    const validAudioMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
    if (content.mimeType && !validAudioMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid audio MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  private static validateVideoContent(content: VideoContent): { valid: boolean; error?: string } {
    const validVideoMimes = ['video/mp4', 'video/webm', 'video/ogg']
    if (content.mimeType && !validVideoMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid video MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  private static validateDataContent(content: DataContent): { valid: boolean; error?: string } {
    const validDataMimes = ['application/json', 'text/csv', 'text/xml', 'application/xml']
    if (content.mimeType && !validDataMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid data MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  static async processContent(content: MultiModalContent): Promise<MultiModalContent> {
    try {
      // Validate content first
      const validation = this.validateContent(content)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Auto-detect MIME type if not provided
      if (!content.mimeType) {
        // Only detect MIME type for Buffer, Uint8Array, or string content
        if (typeof content.content === 'string' || Buffer.isBuffer(content.content) || content.content instanceof Uint8Array) {
          const detectedMime = await this.detectMimeType(content.content)
          if (detectedMime) {
            content.mimeType = detectedMime
          }
        }
      }

      // Process based on content type
      switch (content.type) {
        case 'file':
          return await this.processFileContent(content as FileContent)
        case 'image':
          return await this.processImageContent(content as ImageContent)
        default:
          return content
      }
    } catch (error) {
      console.error('[Multi-Modal] Content processing failed:', error)
      throw error
    }
  }

  private static async processFileContent(content: FileContent): Promise<FileContent> {
    // Generate checksum for integrity
    const buffer = Buffer.isBuffer(content.content) 
      ? content.content 
      : Buffer.from(content.content as string, 'base64')
    
    const checksum = createHash('sha256').update(buffer).digest('hex')
    
    // Store file securely
    const filename = content.metadata?.filename || `file-${checksum.substring(0, 8)}`
    const safeName = this.sanitizeFilename(filename)
    const filePath = join(this.UPLOAD_DIR, safeName)
    
    await fsPromises.mkdir(this.UPLOAD_DIR, { recursive: true })
    await fsPromises.writeFile(filePath, buffer)
    
    return {
      ...content,
      content: filePath, // Store path instead of content
      metadata: {
        ...content.metadata,
        filename: safeName,
        size: buffer.length,
        checksum,
        downloadUrl: `/api/uploads/${safeName}`
      }
    }
  }

  private static async processImageContent(content: ImageContent): Promise<ImageContent> {
    // Add metadata for images
    const processedContent = { ...content }
    
    if (!content.metadata?.alt && content.metadata?.caption) {
      processedContent.metadata = {
        ...content.metadata,
        alt: content.metadata.caption
      }
    }
    
    return processedContent
  }

  private static sanitizeFilename(filename: string): string {
    // Remove dangerous characters and limit length
    const sanitized = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255)
    
    // Ensure extension is preserved
    const ext = extname(filename)
    if (ext && !sanitized.endsWith(ext)) {
      return sanitized.substring(0, 255 - ext.length) + ext
    }
    
    return sanitized
  }

  static async serveContent(content: MultiModalContent): Promise<{
    data: Buffer | string
    mimeType: string
    headers?: Record<string, string>
  }> {
    try {
      let data: Buffer | string
      const mimeType = content.mimeType || 'application/octet-stream'
      const headers: Record<string, string> = {}

      if (content.type === 'file' && typeof content.content === 'string' && content.content.startsWith('/')) {
        // Serve file from disk
        data = await fsPromises.readFile(content.content)
        headers['Content-Disposition'] = `attachment; filename="${content.metadata?.filename || 'download'}"`
      } else if (typeof content.content === 'string') {
        data = content.content
      } else if (Buffer.isBuffer(content.content)) {
        data = content.content
      } else if (content.content instanceof Uint8Array) {
        data = Buffer.from(content.content)
      } else {
        // Handle other types by converting to JSON string
        data = JSON.stringify(content.content)
      }

      return { data, mimeType, headers }
    } catch (error) {
      console.error('[Multi-Modal] Content serving failed:', error)
      throw error
    }
  }

  /**
   * Extract metadata from various content types
   */
  static extractMetadata(content: MultiModalContent): Record<string, unknown> {
    const baseMetadata = {
      type: content.type,
      mimeType: content.mimeType,
      size: this.getContentSize(content.content),
      timestamp: new Date().toISOString()
    }

    switch (content.type) {
      case 'image':
        return {
          ...baseMetadata,
          ...(content as ImageContent).metadata,
          isImage: true
        }
      case 'file':
        return {
          ...baseMetadata,
          ...(content as FileContent).metadata,
          isFile: true
        }
      case 'audio':
        return {
          ...baseMetadata,
          ...(content as AudioContent).metadata,
          isAudio: true
        }
      case 'video':
        return {
          ...baseMetadata,
          ...(content as VideoContent).metadata,
          isVideo: true
        }
      case 'data':
        return {
          ...baseMetadata,
          ...(content as DataContent).metadata,
          isStructuredData: true
        }
      default:
        return baseMetadata
    }
  }

  private static getContentSize(content: MultiModalContent['content']): number {
    if (typeof content === 'string') {
      return Buffer.byteLength(content, 'utf8')
    } else if (Buffer.isBuffer(content)) {
      return content.length
    } else if (content instanceof Uint8Array) {
      return content.length
    } else {
      return JSON.stringify(content).length
    }
  }

  /**
   * Convert content to a streamable format for HTTP responses
   */
  static prepareForStreaming(content: MultiModalContent): {
    contentType: string
    disposition?: string
    data: Buffer | string
  } {
    const contentType = content.mimeType || 'application/octet-stream'
    let disposition: string | undefined
    let data: Buffer | string

    if (content.type === 'file') {
      const filename = (content as FileContent).metadata?.filename || 'download'
      disposition = `attachment; filename="${filename}"`
    }

    if (typeof content.content === 'string') {
      data = content.content
    } else if (Buffer.isBuffer(content.content)) {
      data = content.content
    } else if (content.content instanceof Uint8Array) {
      data = Buffer.from(content.content)
    } else {
      data = JSON.stringify(content.content)
    }

    return { contentType, disposition, data }
  }
}

/**
 * Utility functions for working with multi-modal content
 */
export class MultiModalUtils {
  /**
   * Check if content is a specific type
   */
  static isImageContent(content: MultiModalContent): content is ImageContent {
    return content.type === 'image'
  }

  static isFileContent(content: MultiModalContent): content is FileContent {
    return content.type === 'file'
  }

  static isAudioContent(content: MultiModalContent): content is AudioContent {
    return content.type === 'audio'
  }

  static isVideoContent(content: MultiModalContent): content is VideoContent {
    return content.type === 'video'
  }

  static isDataContent(content: MultiModalContent): content is DataContent {
    return content.type === 'data'
  }

  /**
   * Convert base64 data URL to MultiModalContent
   */
  static fromDataURL(dataUrl: string): MultiModalContent | null {
    try {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return null

      const [, mimeType, base64Data] = match
      const buffer = Buffer.from(base64Data, 'base64')

      // Determine content type based on MIME type
      if (mimeType.startsWith('image/')) {
        return {
          type: 'image',
          content: dataUrl,
          mimeType: mimeType as ImageContent['mimeType']
        }
      } else if (mimeType.startsWith('audio/')) {
        return {
          type: 'audio',
          content: dataUrl,
          mimeType: mimeType as AudioContent['mimeType']
        }
      } else if (mimeType.startsWith('video/')) {
        return {
          type: 'video',
          content: dataUrl,
          mimeType: mimeType as VideoContent['mimeType']
        }
      } else {
        return {
          type: 'file',
          content: buffer,
          mimeType,
          metadata: {
            filename: 'uploaded-file',
            size: buffer.length
          }
        }
      }
    } catch (error) {
      console.error('[Multi-Modal Utils] Failed to parse data URL:', error)
      return null
    }
  }

  /**
   * Convert MultiModalContent to data URL
   */
  static toDataURL(content: MultiModalContent): string | null {
    try {
      const mimeType = content.mimeType || 'application/octet-stream'
      let base64Data: string

      if (typeof content.content === 'string' && content.content.startsWith('data:')) {
        return content.content
      } else if (typeof content.content === 'string') {
        base64Data = Buffer.from(content.content).toString('base64')
      } else if (Buffer.isBuffer(content.content)) {
        base64Data = content.content.toString('base64')
      } else if (content.content instanceof Uint8Array) {
        base64Data = Buffer.from(content.content).toString('base64')
      } else {
        base64Data = Buffer.from(JSON.stringify(content.content)).toString('base64')
      }

      return `data:${mimeType};base64,${base64Data}`
    } catch (error) {
      console.error('[Multi-Modal Utils] Failed to create data URL:', error)
      return null
    }
  }
} 