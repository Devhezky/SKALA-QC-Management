import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import axios from 'axios';
import { cache, CACHE_KEYS } from '@/lib/cache';

// Helper to get Perfex credentials (database first, then env vars)
async function getPerfexCredentials(): Promise<{ url: string | null; key: string | null }> {
    let url: string | null = null;
    let key: string | null = null;

    try {
        const settings = await db.systemSetting.findMany({
            where: {
                key: { in: ['PERFEX_API_URL', 'PERFEX_API_KEY'] }
            }
        });

        for (const s of settings) {
            if (s.key === 'PERFEX_API_URL' && s.value) url = s.value;
            if (s.key === 'PERFEX_API_KEY' && s.value) key = s.value;
        }
    } catch (error) {
        console.log('[Sync] Could not read from database, using env vars');
    }

    // Fallback to environment variables
    if (!url) url = process.env.PERFEX_API_URL || null;
    if (!key) key = process.env.PERFEX_API_KEY || null;

    return { url, key };
}

export async function POST(request: NextRequest) {
    try {
        console.log('=== SYNC PROJECTS START ===');

        // Get credentials from database or env vars
        const { url: perfexUrl, key: perfexKey } = await getPerfexCredentials();

        console.log('PERFEX_API_URL:', perfexUrl);
        console.log('PERFEX_API_KEY:', perfexKey ? 'SET (hidden)' : 'NOT SET');

        if (!perfexUrl || !perfexKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing Perfex API credentials. Please configure in Settings > API.',
                imported: 0,
                skipped: 0
            }, { status: 400 });
        }

        // Use qc_integration custom endpoint (same as Test Koneksi)
        // This endpoint is what actually returns projects from Perfex
        const baseUrl = perfexUrl.replace('/index.php', '');
        const apiEndpoint = `${baseUrl}/index.php/qc_integration/qc_api/get_projects`;

        console.log('Fetching projects from:', apiEndpoint);

        const projectsResponse = await axios.get(apiEndpoint, {
            timeout: 15000
        });

        const response = projectsResponse.data;
        console.log('Raw projects response:', typeof response, 'status:', response?.status);

        // qc_integration returns { status: true, data: [...] }
        if (!response || !response.status || !response.data) {
            return NextResponse.json({
                success: true,
                message: 'No projects found in Perfex',
                imported: 0,
                skipped: 0
            });
        }

        const perfexProjects = response.data;

        if (!perfexProjects || perfexProjects.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No projects found in Perfex',
                imported: 0,
                skipped: 0
            });
        }

        console.log('Fetched projects count:', perfexProjects.length);

        // Fetch clients for name lookup
        let clientLookup = new Map<number, string>();
        try {
            const clientsResponse = await axios.get(`${perfexUrl}/api/customers`, {
                headers: {
                    'authtoken': perfexKey,
                    'Authorization': perfexKey
                },
                timeout: 15000
            });
            const clientsData = clientsResponse.data;
            const clientsArray = Array.isArray(clientsData) ? clientsData : (clientsData.data || []);

            for (const client of clientsArray) {
                const clientId = client.userid || client.id;
                const clientName = client.company || client.name;
                if (clientId && clientName) {
                    clientLookup.set(Number(clientId), clientName);
                }
            }
            console.log('Fetched clients count:', clientsArray.length);
        } catch (clientError) {
            console.warn('Could not fetch clients:', clientError);
        }

        let importedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // For each project, check if it exists and create if not
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
