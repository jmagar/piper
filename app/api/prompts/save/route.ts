import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { filename, content } = await request.json()
    
    if (!filename || !content) {
      return NextResponse.json(
        { error: 'Filename and content are required' },
        { status: 400 }
      )
    }

    // Ensure the filename has .md extension and is safe
    const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`
    const filePath = join(process.cwd(), 'prompts', safeFilename)

    // Write the content to the file
    await writeFile(filePath, content, 'utf8')

    return NextResponse.json({ 
      success: true, 
      message: 'File saved successfully',
      filename: safeFilename 
    })
  } catch (error) {
    console.error('Error saving file:', error)
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    )
  }
} 