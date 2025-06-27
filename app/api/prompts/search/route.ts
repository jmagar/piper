import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const promptsDir = path.join(process.cwd(), 'prompts');
    
    if (!fs.existsSync(promptsDir)) {
      return NextResponse.json({ results: [] });
    }

    const files = fs.readdirSync(promptsDir)
      .filter(file => file.endsWith('.md') || file.endsWith('.MD'));

    const results: { filename: string; content: string; matchCount: number }[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(promptsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Simple text search (case-insensitive)
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        if (lowerContent.includes(lowerQuery)) {
          // Count matches
          const matchCount = (lowerContent.match(new RegExp(lowerQuery, 'g')) || []).length;
          results.push({
            filename: file,
            content,
            matchCount
          });
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }

    // Sort by match count (descending)
    results.sort((a, b) => b.matchCount - a.matchCount);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
} 