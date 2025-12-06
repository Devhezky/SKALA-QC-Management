import { NextRequest, NextResponse } from 'next/server';
import { generateProjectReportPDF } from '@/lib/pdf-generator';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const resolvedParams = await params;
        const projectId = resolvedParams.projectId;
        const { searchParams } = new URL(request.url);
        const includeAI = searchParams.get('includeAI') === 'true' || searchParams.get('ai') === 'true';

        console.log('=== PROJECT PDF EXPORT REQUEST ===');
        console.log('Project ID:', projectId);
        console.log('Include AI Analysis:', includeAI);

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Get AI settings from request body if it was a POST, but this is GET.
        // For GET requests, we can't easily pass complex objects. 
        // If we need AI settings, we might need to switch to POST or pass simplified params.
        // For now, we'll assume default settings or simple query params if needed.
        // If the user wants to customize AI settings, we should probably use POST.

        // Let's support POST as well for custom settings, but for simple download GET is easier.

        const pdfBuffer = await generateProjectReportPDF(projectId, includeAI);

        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="project-report-${projectId}.pdf"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error generating Project PDF:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate Project PDF report',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const resolvedParams = await params;
        const projectId = resolvedParams.projectId;
        const formData = await request.formData();
        const includeAI = formData.get('includeAI') === 'true' || formData.get('ai') === 'true';
        const aiAnalysisContent = formData.get('aiAnalysisContent') as string;
        const aiSettings = formData.get('aiSettings') as string;
        const signatureLogo = formData.get('signatureLogo') as string;

        // If we have specific content, we pass it in a way the generator understands
        // We'll wrap it in the settings object as 'content' property which we handled in the generator
        const effectiveSettings = aiAnalysisContent
            ? { content: aiAnalysisContent, enabled: true }
            : (aiSettings ? JSON.parse(aiSettings) : null);

        console.log('=== PROJECT PDF EXPORT WITH AI SETTINGS ===');
        console.log('Project ID:', projectId);
        console.log('Include AI Analysis:', includeAI);
        console.log('Has Precomputed Content:', !!aiAnalysisContent);
        console.log('Has Signature Logo:', !!signatureLogo);

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        const pdfBuffer = await generateProjectReportPDF(projectId, includeAI, effectiveSettings, signatureLogo);

        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="project-report-${projectId}.pdf"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error generating Project PDF with settings:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate Project PDF report',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
