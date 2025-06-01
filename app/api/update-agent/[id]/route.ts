import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const body = await request.json();
    
    const { name, description, systemPrompt, mcp_config, tools } = body;

    // Validate required fields
    if (!name || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Name, description, and system prompt are required" },
        { status: 400 }
      );
    }

    // Generate slug from name (basic implementation)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Update the agent
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        name,
        description,
        slug,
        system_prompt: systemPrompt,
        mcp_config,
        tools,
        // Include other fields if needed
      },
    });

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "An agent with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
} 