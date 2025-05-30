import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // No users to seed, as all data is admin-only
  // Optionally, create a sample chat for testing
  await prisma.chat.create({
    data: {
      title: "Welcome Chat",
      model: "default",
      systemPrompt: "Welcome to Piper!",
      messages: {
        create: [
          {
            role: "system",
            parts: [{ type: "text", content: "Hello, admin! This is your first chat." }, { type: "data-createdAtInfo", data: new Date() }]
          }
        ]
      }
    }
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })