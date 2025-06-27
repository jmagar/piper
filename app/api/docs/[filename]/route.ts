import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Security: Only allow specific markdown files
    const allowedFiles = [
      'ROO-IMPROVE-CODE.MD',
      'ROO-FIX-ISSUES.MD', 
      'ROO-EXPLAIN-CODE.MD',
      'ROO-ENHANCE-PROMPT.MD',
      'CONTEXT-CONDENSING-PROMPT.md',
      'mcp-server-testing-prompt.md',
      'create-fastmcp-server.md',
      'expert_prompt_writer.md',
      'cursor-rules.md'
    ];

    if (!allowedFiles.includes(filename)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filePath = join('/docs/ai', filename);
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
} 