import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            perfexId: true
        }
    })

    console.log('Projects found:', projects.length)
    projects.forEach(p => {
        console.log(`- [${p.id}] ${p.name}: PerfexID = ${p.perfexId || 'Not Linked'}`)
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
