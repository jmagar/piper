import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
  }

  try {
    // Before deleting an agent, we might need to handle related records,
    // e.g., disassociate or delete chats linked to this agent.
    // For now, let's assume onDelete: Cascade or SetNull is set in Prisma schema if applicable,
    // or that we handle it manually if needed.

    // Example: Disassociating chats from the agent before deletion
    await prisma.chat.updateMany({
      where: { agentId: agentId },
      data: { agentId: null },
    });

    await prisma.agent.delete({
      where: { id: agentId },
    });

    return NextResponse.json(
      { message: "Agent deleted successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error(`Error deleting agent ${agentId}:`, err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    // Check for Prisma-specific errors, e.g., P2025 (Record to delete does not exist)
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 