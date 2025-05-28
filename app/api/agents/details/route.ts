import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const id = searchParams.get("id");

  if (!slug && !id) {
    return NextResponse.json(
      { error: "Either slug or id must be provided" },
      { status: 400 }
    );
  }

  try {
    let agent;
    if (slug) {
      agent = await prisma.agent.findUnique({
        where: { slug },
      });
    } else if (id) {
      // Ensure id is not null or undefined before querying
      agent = await prisma.agent.findUnique({
        where: { id },
      });
    }

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Error fetching agent by slug/id:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent details" },
      { status: 500 }
    );
  }
} 