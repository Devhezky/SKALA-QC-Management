import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('Resetting database...')
  
  // Delete all data in reverse order of dependencies
  await prisma.signature.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.qCInspectionItem.deleteMany()
  await prisma.qCInspection.deleteMany()
  await prisma.checklistItemTemplate.deleteMany()
  await prisma.checklistTemplate.deleteMany()
  await prisma.project.deleteMany()
  await prisma.phase.deleteMany()
  await prisma.user.deleteMany()
  
  console.log('Database reset complete.')
}

resetDatabase()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })