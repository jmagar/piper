import * as fs from "fs"
import * as path from "path"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
// Using simple console logging instead of complex logger system
const uploadLogger = {
  info: (message: string, metadata?: Record<string, unknown>) => console.log(`[UPLOAD INFO] ${message}`, metadata),
  error: (message: string, metadata?: Record<string, unknown>) => console.error(`[UPLOAD ERROR] ${message}`, metadata),
};

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(req: NextRequest) {
  let file: File | null = null
  let chatId: string | null = null
  let originalFileName: string | undefined = undefined
  let fileSize: number | undefined = undefined
  let fileType: string | undefined = undefined

  try {
    const formData = await req.formData()
    const fileData = formData.get('file')
    chatId = formData.get('chatId') as string | null

    if (!(fileData instanceof File)) {
      uploadLogger.error("Upload attempt failed: No file provided or not a file", { chatId, bodyAttempt: formData.toString().substring(0, 200) })
      return new Response(JSON.stringify({ error: "No file provided or invalid file data" }), {
        status: 400
      })
    }
    file = fileData // Assign to the outer scope variable
    originalFileName = file.name
    fileSize = file.size
    fileType = file.type

    if (!chatId) {
      uploadLogger.error("Upload attempt failed: No chatId provided", { fileName: originalFileName, fileSize, fileType })
      return new Response(JSON.stringify({ error: "No chatId provided" }), {
        status: 400,
      })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      uploadLogger.error("Upload attempt failed: File too large", { fileName: originalFileName, fileSize, fileType, chatId, error: errorMsg })
      return new Response(
        JSON.stringify({
          error: errorMsg,
        }),
        { status: 400 }
      )
    }

    const uploadsDir = process.env.UPLOADS_DIR || './uploads'
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const fileExt = file.name.split(".").pop() || 'bin'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = path.join(uploadsDir, fileName)

    // Convert File to Buffer and save to filesystem
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    uploadLogger.info("File uploaded successfully to filesystem", {
      originalFileName,
      generatedFileName: fileName,
      fileSize,
      fileType,
      chatId,
      filesystemPath: filePath,
    })
    
    // Store attachment info in database
    await prisma.attachment.create({
      data: {
        chatId,
        fileName: originalFileName || "unknown_original_name", // Fallback if file was null
        fileType: fileType || "unknown_type",
        fileSize: fileSize || 0,
        filePath: `/uploads/${fileName}`, // This is the URL path, not filesystem path
      }
    })

    uploadLogger.info("Attachment metadata stored in database", {
      originalFileName,
      generatedFileName: fileName,
      fileSize,
      fileType,
      chatId,
      dbFilePath: `/uploads/${fileName}`,
    })

    // Return relative path for URL
    const fileUrl = `/uploads/${fileName}`
    
    return new Response(
      JSON.stringify({
        success: true,
        attachment: {
          name: originalFileName || "unknown_original_name",
          contentType: fileType || "unknown_type",
          url: fileUrl,
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    uploadLogger.error("Unhandled error during file upload", {
      originalFileName: originalFileName || "N/A (error before file parse)",
      fileSize: fileSize || "N/A",
      fileType: fileType || "N/A",
      chatId: chatId || "N/A (error before chatId parse)",
      error, // The logger will stringify this, including stack trace if it's an Error
    })
    
    return new Response(
      JSON.stringify({ error: "Failed to upload file" }),
      { status: 500 }
    )
  }
}