import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: promptId } = params;

  if (!promptId) {
    return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 });
  }

  try {
    // Check if rule exists before attempting to delete
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

    // Delete the rule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).prompt.delete({
      where: { id: promptId },
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Prompt deleted successfully" 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting prompt:", error);
    
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
} 