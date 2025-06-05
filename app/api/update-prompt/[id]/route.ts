import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: promptId } = params;
    const body = await request.json();
    const { name, description, systemPrompt } = body;

    // Validate required fields
    if (!name || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Name, description, and system prompt are required" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    if (systemPrompt.length > 10000) {
      return NextResponse.json(
        { error: "System prompt must be 10,000 characters or less" },
        { status: 400 }
      );
    }

    // Check if rule exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingPrompt = await (prisma as any).prompt.findUnique({
      where: { id: promptId },
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: "Prompt not found" },
        { status: 404 }
      );
    }

    // Generate new slug if name changed
    let slug = existingPrompt.slug;
    if (name.trim() !== existingPrompt.name) {
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Ensure unique slug
      slug = baseSlug;
      let counter = 1;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      while (await (prisma as any).prompt.findFirst({ 
        where: { 
          slug,
          id: { not: promptId } // Exclude current prompt from uniqueness check
        } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Update the rule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedPrompt = await (prisma as any).prompt.update({
      where: { id: promptId },
      data: {
        name: name.trim(),
        description: description.trim(),
        slug,
        system_prompt: systemPrompt.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      prompt: updatedPrompt,
      message: "Prompt updated successfully",
    });
  } catch (error) {
    console.error("Error updating prompt:", error);
    
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A prompt with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
} 