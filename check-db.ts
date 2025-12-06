import { db } from './src/lib/db'

async function main() {
  const projects = await db.project.findMany()
  console.log('Projects in DB:', projects.length)
  projects.forEach(p => console.log(`- ${p.name} (ID: ${p.id}, PerfexID: ${p.perfexId})`))
  const users = await db.user.findMany()
  console.log('Users in DB:', users.length)
  users.forEach(u => console.log(`- ${u.email} (${u.id})`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await db.$disconnect()
  })