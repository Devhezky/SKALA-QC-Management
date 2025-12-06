import { NextRequest, NextResponse } from 'next/server';
import { generateQCReportPDF } from '@/lib/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const inspectionId = resolvedParams.inspectionId;
    const { searchParams } = new URL(request.url);
    const includeAI = searchParams.get('includeAI') === 'true' || searchParams.get('ai') === 'true';

    console.log('=== PDF EXPORT REQUEST ===');
    console.log('Inspection ID:', inspectionId);
    console.log('Include AI Analysis:', includeAI);

    // Validate inspection ID
    if (!inspectionId) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      );
    }

    // Try to find inspection by exact ID match first
    let actualInspectionId = inspectionId;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // First, try to find by exact ID
      let inspection = await prisma.qCInspection.findUnique({
        where: { id: inspectionId },
        include: {
          project: true,
          phase: true,
          inspector: true,
        },
      });

      console.log('Search by ID result:', inspection ? 'Found' : 'Not found');

      // If not found by ID, try to find latest inspection for this phase
      if (!inspection) {
        inspection = await prisma.qCInspection.findFirst({
          where: { phaseId: inspectionId },
          include: {
            project: true,
            phase: true,
            inspector: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        console.log('Search by phaseId result:', inspection ? 'Found' : 'Not found');
        console.log('Found phase:', inspection?.phase.name);
      }
      
      if (!inspection) {
        return NextResponse.json(
          { error: 'No inspection found for this phase/inspection ID' },
          { status: 404 }
        );
      }
      
      actualInspectionId = inspection.id;
      console.log('Final inspectionId:', actualInspectionId);
      console.log('Phase name:', inspection.phase.name);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }

    // Get AI settings from localStorage equivalent (passed via header or body)
    let aiSettings = null;
    try {
      // Try to get AI settings from request body if available
      const body = await request.json().catch(() => null);
      if (body?.aiSettings) {
        aiSettings = body.aiSettings;
        console.log('Using AI settings from request body');
      }
    } catch (error) {
      console.log('No AI settings in request body');
    }

    // Generate PDF with AI analysis if requested
    const pdfBuffer = await generateQCReportPDF(actualInspectionId, includeAI, aiSettings);

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="qc-report-${actualInspectionId}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const inspectionId = resolvedParams.inspectionId;
    // Handle FormData instead of JSON
    const formData = await request.formData();
    const includeAI = formData.get('includeAI') === 'true' || formData.get('ai') === 'true';
    const aiSettingsStr = formData.get('aiSettings') as string;
    const aiSettings = aiSettingsStr ? JSON.parse(aiSettingsStr) : null;

    console.log('=== PDF EXPORT WITH AI SETTINGS ===');
    console.log('Inspection ID:', inspectionId);
    console.log('Include AI Analysis:', includeAI);
    console.log('AI Settings provided:', !!aiSettings);

    // Validate inspection ID
    if (!inspectionId) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      );
    }

    // Find inspection
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    let actualInspectionId = inspectionId;
    
    try {
      let inspection = await prisma.qCInspection.findUnique({
        where: { id: inspectionId },
        include: {
          project: true,
          phase: true,
          inspector: true,
        },
      });

      if (!inspection) {
        inspection = await prisma.qCInspection.findFirst({
          where: { phaseId: inspectionId },
          include: {
            project: true,
            phase: true,
            inspector: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      
      if (!inspection) {
        return NextResponse.json(
          { error: 'No inspection found for this phase/inspection ID' },
          { status: 404 }
        );
      }
      
      actualInspectionId = inspection.id;
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }

    // Generate PDF with AI settings
    const pdfBuffer = await generateQCReportPDF(actualInspectionId, includeAI, aiSettings);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="qc-report-${actualInspectionId}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating PDF with AI settings:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
