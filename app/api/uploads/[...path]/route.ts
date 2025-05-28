import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params
    const uploadsDir = process.env.UPLOADS_DIR || './uploads'
    const filePath = path.join(uploadsDir, ...params.path)
    
    // Security check: ensure the file is within the uploads directory
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadsDir = path.resolve(uploadsDir)
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse('File not found', { status: 404 })
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(resolvedPath)
    const fileName = path.basename(resolvedPath)
    
    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    }
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 