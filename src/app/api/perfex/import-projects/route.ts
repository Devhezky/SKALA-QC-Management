import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import axios from 'axios';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { perfexClient } from '@/lib/perfex-client';

export async function POST(request: NextRequest) {
    try {
        console.log('=== SYNC PROJECTS START ===');
        console.log('PERFEX_API_URL:', process.env.PERFEX_API_URL);
        // console.log('PERFEX_API_KEY:', process.env.PERFEX_API_KEY ? 'SET (hidden)' : 'NOT SET'); // This line is removed as API key is not directly used with axios for this endpoint

        // Use standard API endpoints instead of broken qc_integration
        const response = await perfexClient.getProjects();

        if (!response || response.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No projects found in Perfex',
                imported: 0,
                skipped: 0
            });
        }

        const perfexProjects = response;
        console.log('Fetched projects count:', perfexProjects.length);

        // Fetch clients to map names since standard API might only give IDs
        const perfexClients = await perfexClient.getClients();
        const clientLookup = new Map<number, string>();

        // Handle various response structures for clients
        const clientsArray = Array.isArray(perfexClients) ? perfexClients :
            (perfexClients as any).data ? (perfexClients as any).data : [];

        for (const client of clientsArray) {
            const clientId = client.userid || client.id;
            const clientName = client.company || client.name;
            if (clientId && clientName) {
                clientLookup.set(Number(clientId), clientName);
            }
        }
        console.log('Fetched clients count:', clientsArray.length);

        let importedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // 2. For each project, check if it exists and create if not
        for (const perfexProject of perfexProjects) {
            try {
                // Check if project already exists by perfexId
                const existing = await db.project.findFirst({
                    where: { perfexId: Number(perfexProject.id) }
                });

                // Use client_name from lookup or fallback
                const clientName = clientLookup.get(Number(perfexProject.clientid)) || perfexProject.company || 'Unknown Client';
                let clientDbId: string | null = null;

                if (perfexProject.clientid) {
                    const client = await db.client.findUnique({
                        where: { perfexId: Number(perfexProject.clientid) }
                    });
                    if (client) {
                        clientDbId = client.id;
                    }
                }

                const projectData = {
                    name: perfexProject.name,
                    code: `PERFEX-${perfexProject.id}`,
                    description: perfexProject.description || '',
                    clientName: clientName,
                    location: 'Imported from Perfex',
                    projectType: 'CONSTRUCTION',
                    startDate: perfexProject.start_date ? new Date(perfexProject.start_date) : new Date(),
                    endDate: perfexProject.deadline ? new Date(perfexProject.deadline) : null,
                    totalValue: perfexProject.project_cost ? parseFloat(String(perfexProject.project_cost)) : 0,
                    perfexId: Number(perfexProject.id),
                    status: mapPerfexStatus(perfexProject.status) as any,
                };

                if (existing) {
                    // Update existing project - use direct field assignment
                    console.log(`Updating project ${perfexProject.id}: status ${perfexProject.status} -> ${projectData.status}`);
                    await db.project.update({
                        where: { id: existing.id },
                        data: {
                            ...projectData,
                            clientDbId: clientDbId // Direct field assignment for update
                        }
                    });
                } else {
                    // Create new project
                    // Find first available user for imports
                    const adminUser = await db.user.findFirst({
                        orderBy: { createdAt: 'asc' }
                    });

                    if (!adminUser) {
                        throw new Error('No users found in the system. Please create a user first.');
                    }

                    console.log('Using user for import:', adminUser.email);

                    await db.project.create({
                        data: {
                            ...projectData,
                            createdBy: {
                                connect: { id: adminUser.id }
                            },
                            // Use client relation connect for create
                            ...(clientDbId ? { client: { connect: { id: clientDbId } } } : {})
                        }
                    });
                    importedCount++;
                }

                importedCount++;
            } catch (error) {
                console.error(`Error importing project ${perfexProject.id}:`, error);
                errors.push(`Failed to import project ${perfexProject.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Invalidate cache after sync
        cache.invalidate(CACHE_KEYS.PROJECTS);
        cache.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);

        return NextResponse.json({
            success: true,
            message: `Import complete. ${importedCount} projects imported, ${skippedCount} skipped.`,
            imported: importedCount,
            skipped: skippedCount,
            total: perfexProjects.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error importing projects from Perfex:', error);
        return NextResponse.json(
            {
                error: 'Failed to import projects',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Map Perfex status to QC app status
function mapPerfexStatus(perfexStatus: string | number): string {
    // Perfex: 1: Not Started, 2: In Progress, 3: On Hold, 4: Finished, 5: Cancelled
    // Prisma: ACTIVE, COMPLETED, ON_HOLD, CANCELLED
    const status = typeof perfexStatus === 'string' ? parseInt(perfexStatus, 10) : perfexStatus;

    switch (status) {
        case 1: return 'ACTIVE'; // Not Started -> ACTIVE
        case 2: return 'ACTIVE'; // In Progress -> ACTIVE
        case 3: return 'ON_HOLD';
        case 4: return 'COMPLETED';
        case 5: return 'CANCELLED';
        default: return 'ACTIVE';
    }
}
