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
    const includeAI = searchParams.get('includeAI') === 'true';

    console.log('=== PROJECT PDF EXPORT REQUEST ===');
    console.log('Project ID:', projectId);
    console.log('Include AI Analysis:', includeAI);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Generate PDF with AI analysis if requested (but without settings since it's GET)
    const pdfBuffer = await generateProjectReportPDF(projectId, includeAI);

    // Return PDF as response
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
    console.error('Error generating project PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate project PDF report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    
    // Handle FormData instead of JSON
    const formData = await request.formData();
    const includeAI = formData.get('includeAI') === 'true';
    const aiSettingsStr = formData.get('aiSettings') as string;
    const aiSettings = aiSettingsStr ? JSON.parse(aiSettingsStr) : null;

    console.log('=== PROJECT PDF EXPORT REQUEST (POST) ===');
    console.log('Project ID:', projectId);
    console.log('Include AI Analysis:', includeAI);
    console.log('AI Settings provided:', !!aiSettings);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Generate PDF with AI analysis if requested and settings provided
    const pdfBuffer = await generateProjectReportPDF(projectId, includeAI, aiSettings);

    // Return PDF as response
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
    console.error('Error generating project PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate project PDF report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
