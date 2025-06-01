import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ruleId } = await params;

  if (!ruleId) {
    return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
  }

  try {
    // Check if rule exists before attempting to delete
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

    // Delete the rule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).rule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Rule deleted successfully" 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting rule:", error);
    
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
} 