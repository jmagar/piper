import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ruleId } = await params;
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
    const existingRule = await (prisma as any).rule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Generate new slug if name changed
    let slug = existingRule.slug;
    if (name.trim() !== existingRule.name) {
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Ensure unique slug
      slug = baseSlug;
      let counter = 1;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      while (await (prisma as any).rule.findFirst({ 
        where: { 
          slug,
          id: { not: ruleId } // Exclude current rule from uniqueness check
        } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Update the rule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedRule = await (prisma as any).rule.update({
      where: { id: ruleId },
      data: {
        name: name.trim(),
        description: description.trim(),
        slug,
        system_prompt: systemPrompt.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      rule: updatedRule,
      message: "Rule updated successfully",
    });
  } catch (error) {
    console.error("Error updating rule:", error);
    
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A rule with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
} 