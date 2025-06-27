import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { RedisCacheManager } from '@/lib/mcp/modules/redis-cache-manager';
import { writeFile } from 'fs/promises';

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const cacheManager = RedisCacheManager.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 1. Check Redis cache first
    const cachedContent = await cacheManager.getRawPromptContent(filename);
    if (cachedContent) {
      return new NextResponse(cachedContent, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Cache': 'HIT',
        },
      });
    }

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

    // 3. Store in Redis with a long TTL
    await cacheManager.setRawPromptContent(filename, content, CACHE_TTL_SECONDS);

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // 2. Write to filesystem
    const filePath = join(process.cwd(), '../docs/ai', filename);
    await writeFile(filePath, content, 'utf8');

    // 3. Invalidate Redis cache
    await cacheManager.clearRawPromptContent(filename);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error saving prompt:', error);
    return NextResponse.json(
      { error: 'Failed to save prompt' },
      { status: 500 }
    );
  }
} 