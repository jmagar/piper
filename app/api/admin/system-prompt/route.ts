import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Handler to get the admin's system prompt
export async function GET() {
  try {
    const adminSettings = await prisma.adminSetting.findUnique({
      where: { id: "default_admin_settings" },
      select: { systemPrompt: true },
    });

    if (!adminSettings) {
      // If settings entry doesn't exist, return null prompt.
      // The upsert in POST will create it if needed.
      return NextResponse.json({ systemPrompt: null }, { status: 200 });
    }

    return NextResponse.json({ systemPrompt: adminSettings.systemPrompt ?? null });
  } catch (error) {
    console.error("Error fetching admin system prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch system prompt" },
      { status: 500 }
    );
  }
}

// Handler to update the admin's system prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemPrompt } = body;

    if (typeof systemPrompt !== 'string' && systemPrompt !== null) {
      return NextResponse.json(
        { error: "Invalid systemPrompt value" },
        { status: 400 }
      );
    }

    // Ensure the admin settings entry exists, create if not.
    const settingsEntry = await prisma.adminSetting.upsert({
      where: { id: "default_admin_settings" },
      update: { systemPrompt: systemPrompt },
      create: {
        id: "default_admin_settings",
        systemPrompt: systemPrompt,
      },
    });

    return NextResponse.json({ systemPrompt: settingsEntry.systemPrompt });
  } catch (error) {
    console.error("Error updating admin system prompt:", error);
    const errorMessage = "Failed to update system prompt"; // Changed to const
    // Check for specific Prisma errors, like unique constraint if email were used and not unique
    // if (error instanceof Prisma.PrismaClientKnownRequestError) {
    //   if (error.code === 'P2002') { // Unique constraint failed
    //     errorMessage = "A user with this identifier already exists.";
    //   }
    // }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 