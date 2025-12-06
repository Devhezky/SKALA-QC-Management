import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      code: true
    }
  })
  
  console.log('Available Projects:')
  projects.forEach(p => {
    console.log(`${p.code} - ${p.name} (ID: ${p.id})`)
  })

  const phases = await prisma.phase.findMany({
    select: {
      id: true,
      name: true,
      order: true
    },
    orderBy: { order: 'asc' }
  })
  
  console.log('\nAvailable Phases:')
  phases.forEach(p => {
    console.log(`${p.order}. ${p.name} (ID: ${p.id})`)
  })

  const templates = await prisma.checklistTemplate.findMany({
    select: {
      id: true,
      name: true,
      projectType: true
    }
  })
  
  console.log('\nAvailable Templates:')
  templates.forEach(t => {
    console.log(`${t.name} - ${t.projectType} (ID: ${t.id})`)
  })

  await prisma.$disconnect()
}

main()