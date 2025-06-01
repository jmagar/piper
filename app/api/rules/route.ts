import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    const skip = (validPage - 1) * validLimit;

    // Build where clause for search
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Get total count for pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await (prisma as any).rule.count({
      where: whereClause,
    });

    // Get rules with pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = await (prisma as any).rule.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: validLimit,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        system_prompt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validLimit);
    const hasNext = validPage < totalPages;
    const hasPrev = validPage > 1;

    return NextResponse.json({
      success: true,
      data: rules,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
} 