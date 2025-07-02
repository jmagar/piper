import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Input validation helpers
function validateSlug(slug: string): boolean {
  // Slug should be alphanumeric with hyphens/underscores, reasonable length
  return /^[a-zA-Z0-9/_-]+$/.test(slug) && slug.length >= 1 && slug.length <= 100;
}

function validateId(id: string): boolean {
  // ID should be a valid UUID format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

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

  // Validate slug format if provided
  if (slug && !validateSlug(slug)) {
    return NextResponse.json(
      { error: "Invalid slug format" },
      { status: 400 }
    );
  }

  // Validate ID format if provided
  if (id && !validateId(id)) {
    return NextResponse.json(
      { error: "Invalid ID format" },
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