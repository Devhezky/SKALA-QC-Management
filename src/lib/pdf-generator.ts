import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface InspectionData {
  id: string;
  project: {
    code: string;
    name: string;
    clientName: string;
    location: string;
  };
  phase: {
    name: string;
    order: number;
  };
  inspector: {
    name: string;
    email: string;
  };
  status: string;
  score: number | null;
  comments: string | null;
  submittedAt: string | null;
  items: Array<{
    template: {
      code: string;
      title: string;
      acceptanceCriteria: string;
      checkMethod: string;
    };
    status: string;
    measuredValue: string | null;
    notes: string | null;
    isMandatory: boolean;
    weight: number;
    score: number | null;
    attachments: Array<{
      filename: string;
      filePath: string;
      fileType: string;
    }>;
  }>;
  signatures: Array<{
    signer: {
      name: string;
      email: string;
    };
    signerRole: string;
    status: string;
    signatureData: string | null;
    comments: string | null;
    signedAt: string | null;
  }>;
}

// Function to normalize status text
function normalizeStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'OK': return 'OK';
    case 'NOT_OK': return 'NOT OK';
    case 'NA': return 'N/A';
    case 'PENDING': return 'PENDING';
    case 'IN_PROGRESS': return 'IN PROGRESS';
    case 'NEEDS_REWORK': return 'NEEDS REWORK';
    case 'APPROVED': return 'APPROVED';
    case 'REJECTED': return 'REJECTED';
    case 'SUBMITTED': return 'SUBMITTED';
    default: return status.toUpperCase();
  }
}

// Function to generate QC summary with logic
function generateQCSummary(items: InspectionData['items'], overallScore: number | null): string {
  const statusCounts = {
    ok: items.filter(item => item.status.toUpperCase() === 'OK').length,
    notOk: items.filter(item => item.status.toUpperCase() === 'NOT_OK').length,
    pending: items.filter(item => item.status.toUpperCase() === 'PENDING').length,
    na: items.filter(item => item.status.toUpperCase() === 'NA').length,
  };

  const totalItems = items.length;
  const completionRate = ((statusCounts.ok + statusCounts.na) / totalItems) * 100;
  const criticalIssues = statusCounts.notOk;
  const pendingItems = statusCounts.pending;

  let summary = '';

  // Overall assessment
  if (overallScore && overallScore >= 90) {
    summary += 'EXCELLENT: Kualitas pekerjaan memenuhi standar tertinggi dengan sangat baik. ';
  } else if (overallScore && overallScore >= 70) {
    summary += 'GOOD: Kualitas pekerjaan baik namun ada beberapa area yang perlu diperhatikan. ';
  } else if (overallScore && overallScore >= 50) {
    summary += 'NEEDS IMPROVEMENT: Kualitas pekerjaan memerlukan perbaikan signifikan. ';
  } else {
    summary += 'CRITICAL: Kualitas pekerjaan tidak memenuhi standar dan memerlukan tindakan segera. ';
  }

  // Specific findings
  if (criticalIssues > 0) {
    summary += `Ditemukan ${criticalIssues} item kritis yang gagal QC. `;
  }

  if (pendingItems > 0) {
    summary += `Ada ${pendingItems} item yang masih menunggu penyelesaian. `;
  }

  // Completion status
  if (completionRate === 100) {
    summary += 'Semua item telah selesai diperiksa. ';
  } else {
    summary += `Progres completion: ${completionRate.toFixed(1)}% (${statusCounts.ok + statusCounts.na}/${totalItems} item selesai). `;
  }

  // Recommendations
  if (criticalIssues > 0) {
    summary += 'REKOMENDASI: Segera perbaiki semua item kritis sebelum melanjutkan ke fase berikutnya. ';
  }

  if (pendingItems > 0 && pendingItems > criticalIssues) {
    summary += 'REKOMENDASI: Prioritaskan penyelesaian item yang pending untuk menyelesaikan inspeksi. ';
  }

  if (criticalIssues === 0 && pendingItems === 0 && completionRate === 100) {
    summary += 'QC COMPLETED: Tidak ada isu kritis, pekerjaan siap untuk tahap approval. ';
  }

  return summary;
}

// Function to call AI analysis API
async function getAIAnalysis(inspectionData: any, aiSettings?: any): Promise<string | null> {
  // Only use provided AI settings (no localStorage fallback on server-side)
  const settings = aiSettings;

  if (!settings || !settings.enabled || !settings.apiKey) {
    console.log('AI analysis disabled or not configured');
    return null;
  }

  try {
    console.log('Requesting AI analysis with provider:', settings.provider);

    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qcData: {
          projectName: inspectionData.project.name,
          phaseName: inspectionData.phase.name,
          score: inspectionData.score,
          completedItems: inspectionData.items.filter(item => item.status.toUpperCase() === 'OK').length,
          totalItems: inspectionData.items.length,
          criticalItems: inspectionData.items.filter(item => item.status.toUpperCase() === 'NOT_OK').length,
          items: inspectionData.items.map(item => ({
            name: item.template.title,
            score: item.score || 0,
            status: item.status,
            notes: item.notes
          })),
          inspectorNotes: inspectionData.comments
        },
        apiKey: settings.apiKey,
        provider: settings.provider || 'openai',
        model: settings.model || (settings.provider === 'openai' ? 'gpt-4-turbo' : settings.provider === 'gemini' ? 'gemini-1.5-flash' : 'glm-4.5'),
        temperature: settings.temperature || 0.7,
        maxTokens: settings.maxTokens || 2000,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('AI analysis completed successfully with', result.provider);
      return result.analysis;
    } else {
      console.error('AI analysis failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error calling AI analysis:', error);
    return null;
  }
}

// Function to generate comprehensive project-wide AI analysis
async function getProjectAIAnalysis(inspections: any[], aiSettings?: any): Promise<string | null> {
  const settings = aiSettings;

  if (!settings || !settings.enabled || !settings.apiKey) {
    console.log('AI analysis disabled or not configured');
    return null;
  }

  try {
    console.log('Requesting project-wide AI analysis with provider:', settings.provider);

    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      : 'http://localhost:3000';

    // Aggregate data from all inspections
    const allItems = inspections.flatMap(insp => insp.items);
    const totalItems = allItems.length;
    const totalCompleted = allItems.filter(item => item.status.toUpperCase() === 'OK').length;
    const totalCritical = allItems.filter(item => item.status.toUpperCase() === 'NOT_OK').length;
    const overallScore = inspections.reduce((sum, insp) => sum + (insp.score || 0), 0) / inspections.length;

    const response = await fetch(`${baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qcData: {
          projectName: inspections[0]?.project?.name || 'Unknown Project',
          phaseName: 'Complete Project Summary',
          score: overallScore,
          completedItems: totalCompleted,
          totalItems: totalItems,
          criticalItems: totalCritical,
          items: allItems.slice(0, 20).map(item => ({ // Limit to 20 most important items
            name: item.template.title,
            score: item.score || 0,
            status: item.status,
            notes: item.notes
          })),
          inspectorNotes: inspections.map(insp =>
            `${insp.phase.name}: ${insp.comments || 'No comments'}`
          ).join('; ')
        },
        apiKey: settings.apiKey,
        provider: settings.provider || 'openai',
        model: settings.model || (settings.provider === 'openai' ? 'gpt-4-turbo' : settings.provider === 'gemini' ? 'gemini-1.5-flash' : 'glm-4.5'),
        temperature: settings.temperature || 0.7,
        maxTokens: settings.maxTokens || 3000, // Increased for comprehensive analysis
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Project AI analysis completed successfully with', result.provider);
      return result.analysis;
    } else {
      console.error('Project AI analysis failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error calling project AI analysis:', error);
    return null;
  }
}

export async function generateQCReportPDF(inspectionId: string, includeAI: boolean = false, aiSettings?: any): Promise<Buffer> {
  // Fetch inspection data
  const inspection = await prisma.qCInspection.findUnique({
    where: { id: inspectionId },
    include: {
      project: true,
      phase: true,
      inspector: true,
      items: {
        include: {
          template: true,
          attachments: true,
        },
        orderBy: {
          template: {
            code: 'asc',
          },
        },
      },
      signatures: {
        include: {
          signer: true,
        },
      },
    },
  });

  if (!inspection) {
    throw new Error('Inspection not found');
  }

  console.log('=== PDF GENERATION DEBUG ===');
  console.log('Inspection ID:', inspection.id);
  console.log('Phase:', inspection.phase.name);
  console.log('Total Items:', inspection.items.length);
  console.log('Include AI Analysis:', includeAI);
  console.log('AI Settings provided:', !!aiSettings);

  // Get AI analysis if requested
  let aiAnalysis: string | null = null;
  if (includeAI) {
    aiAnalysis = await getAIAnalysis(inspection, aiSettings);
  }

  // Create PDF document
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // blue-500
  const successColor: [number, number, number] = [34, 197, 94]; // green-500
  const warningColor: [number, number, number] = [249, 115, 22]; // orange-500
  const dangerColor: [number, number, number] = [239, 68, 68]; // red-500
  const grayColor: [number, number, number] = [107, 114, 128]; // gray-500

  // Helper functions
  const getStatusColor = (status: string): [number, number, number] => {
    switch (status.toUpperCase()) {
      case 'APPROVED': return [34, 197, 94];
      case 'SUBMITTED': return [59, 130, 246];
      case 'REJECTED': return [239, 68, 68];
      case 'NEEDS_REWORK': return [249, 115, 22];
      default: return [107, 114, 128];
    }
  };

  const getItemStatusColor = (status: string): [number, number, number] => {
    switch (status.toUpperCase()) {
      case 'OK': return [34, 197, 94];
      case 'NOT_OK': return [239, 68, 68];
      case 'NA': return [107, 114, 128];
      case 'PENDING': return [249, 115, 22];
      default: return [107, 114, 128];
    }
  };

  // === HEADER ===
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('QC INSPECTION REPORT', pageWidth / 2, 25, { align: 'center' });

  // === PROJECT INFORMATION ===
  let currentY = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', 20, 55);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 58, pageWidth - 20, 58);

  // Project info table
  autoTable(doc, {
    startY: 62,
    head: [['Field', 'Value']],
    body: [
      ['Project Code', inspection.project.code],
      ['Project Name', inspection.project.name],
      ['Client Name', inspection.project.clientName],
      ['Location', inspection.project.location],
      ['Inspection Phase', inspection.phase.name],
      ['Inspector', `${inspection.inspector.name} (${inspection.inspector.email})`],
      ['Inspection ID', inspection.id],
      ['Date', inspection.submittedAt ? new Date(inspection.submittedAt).toLocaleDateString('id-ID') : '-'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      font: 'helvetica',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40, font: 'helvetica' },
      1: { cellWidth: 'auto', font: 'helvetica' },
    },
  });

  // === QC SUMMARY ===
  currentY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('QC Summary & Assessment', 20, currentY);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

  currentY += 10;

  // Generate and add QC summary
  const qcSummary = generateQCSummary(inspection.items, inspection.score);
  console.log('QC Summary:', qcSummary);

  // Summary box with background
  const summaryLines = doc.splitTextToSize(qcSummary, pageWidth - 40);
  const summaryHeight = summaryLines.length * 6 + 10; // Increased line height

  doc.setFillColor(245, 245, 245);
  doc.rect(20, currentY, pageWidth - 40, summaryHeight, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  summaryLines.forEach((line: string, index: number) => {
    doc.text(line, 25, currentY + 8 + (index * 6)); // Increased spacing
  });

  currentY += summaryHeight + 10;

  // === AI ANALYSIS SECTION ===
  if (aiAnalysis) {
    // Check if we need a new page
    if (currentY > pageHeight - 120) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Analysis & Insights', 20, currentY);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

    currentY += 10;

    // AI Analysis box with background - FULL WIDTH matching table margins
    // Use pageWidth - 40 to match the table width (20mm margin on each side)
    // The text wrapping width should be slightly less than the box width to provide padding
    const boxWidth = pageWidth - 40;
    const textWidth = boxWidth - 10; // 5mm padding on each side
    const aiLines = doc.splitTextToSize(aiAnalysis, textWidth);

    // Calculate height based on lines, with a minimum height
    const lineHeight = 5;
    const padding = 15;
    const calculatedHeight = aiLines.length * lineHeight + padding;
    const aiHeight = Math.min(calculatedHeight, 150); // Increased max height limit

    // Full-width container with light blue background - matching table positioning
    doc.setFillColor(240, 248, 255); // Light blue background
    doc.rect(20, currentY, boxWidth, aiHeight, 'F'); // Full width from margin to margin (same as tables)

    // Add border to match table styling
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, currentY, boxWidth, aiHeight); // Border matching table style

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Add AI badge
    doc.setFillColor(59, 130, 246);
    doc.circle(30, currentY + 5, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('AI', 30, currentY + 5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    let lineIndex = 0;
    const maxLines = Math.floor((aiHeight - padding) / lineHeight);

    for (let i = 0; i < maxLines && i < aiLines.length; i++) {
      // Text position: x = 25 (20 margin + 5 padding)
      doc.text(aiLines[i], 25, currentY + 15 + (i * lineHeight));
      lineIndex++;
    }

    currentY += aiHeight + 10;

    // Add note about AI analysis
    const settings = aiSettings;
    const providerName = settings?.provider === 'openai' ? 'OpenAI' : settings?.provider === 'gemini' ? 'Google Gemini' : 'GLM';

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`* AI analysis generated by ${providerName} model for enhanced insights`, 20, currentY);
    doc.text('* AI recommendations should be reviewed by qualified personnel', 20, currentY + 4);

    currentY += 15;
  }

  // === STATUS & SCORE ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Status & Score Summary', 20, currentY);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

  currentY += 10;

  // Status and score info
  const statusColor = getStatusColor(inspection.status);
  const normalizedStatus = normalizeStatus(inspection.status);

  // Status badge
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(20, currentY, 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizedStatus, 40, currentY + 7, { align: 'center' });

  // Score information
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Score: ${inspection.score ? inspection.score.toFixed(2) : 'N/A'}`, 70, currentY + 7);

  // Comments if available
  if (inspection.comments) {
    currentY += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Comments: ${inspection.comments}`, 20, currentY);
    currentY += 10;
  } else {
    currentY += 15;
  }

  // === CHECKLIST ITEMS ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist Items', 20, currentY);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

  currentY += 10;

  // Prepare checklist data with EMPTY status for column 2 (to prevent double rendering)
  // Filter items to ensure they belong to the current phase (defensive check)
  const filteredItems = inspection.items.filter(item => item.template.phaseId === inspection.phaseId);

  const checklistData = filteredItems.map(item => {
    const normalizedItemStatus = normalizeStatus(item.status);
    return [
      item.template.code,
      item.template.title.substring(0, 40) + (item.template.title.length > 40 ? '...' : ''),
      '', // EMPTY - prevent default text rendering
      item.measuredValue || '-',
      item.isMandatory ? 'Yes' : 'No',
      item.score ? item.score.toString() : '-',
    ];
  });

  console.log('Checklist Data Length:', checklistData.length);

  autoTable(doc, {
    startY: currentY,
    head: [['Code', 'Item', 'Status', 'Value', 'Mandatory', 'Score']],
    body: checklistData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 20, font: 'helvetica' }, // Code
      1: { cellWidth: 'auto', font: 'helvetica' }, // Item - auto width to fill space
      2: { cellWidth: 30, font: 'helvetica' }, // Status
      3: { cellWidth: 30, font: 'helvetica' }, // Value
      4: { cellWidth: 20, font: 'helvetica' }, // Mandatory
      5: { cellWidth: 15, font: 'helvetica' }, // Score
    },
    didDrawCell: (data) => {
      // ONLY render colored text in status column (column 2)
      if (data.section === 'body' && data.column.index === 2) {
        const status = inspection.items[data.row.index].status;
        const normalizedItemStatus = normalizeStatus(status);
        const statusColor = getItemStatusColor(status);

        // Clear cell first with white background
        doc.setFillColor(255, 255, 255);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

        // Draw colored status text
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(normalizedItemStatus, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, {
          align: 'center',
        });
      }
    },
  });

  // === PHOTOS SECTION ===
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Photo Evidence', 20, currentY);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

  currentY += 10;

  // Add photos if available
  const photos = inspection.items.flatMap(item => item.attachments.filter(att => att.fileType === 'PHOTO'));

  if (photos.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Photos: ${photos.length}`, 20, currentY);

    // For now, just list photos (image processing would require additional handling)
    currentY += 8;
    photos.forEach((photo, index) => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${index + 1}. ${photo.filename}`, 25, currentY);
      currentY += 6;
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No photos attached', 20, currentY);
    currentY += 8;
  }

  // === SIGNATURES ===
  currentY += 10;

  // Check if we need a new page
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Digital Signatures', 20, currentY);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

  currentY += 10;

  if (inspection.signatures.length > 0) {
    inspection.signatures.forEach((signature, index) => {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 20;
      }

      const sigColor = signature.status === 'APPROVED' ? successColor :
        signature.status === 'REJECTED' ? dangerColor : grayColor;

      // Signature info
      doc.setTextColor(sigColor[0], sigColor[1], sigColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${signature.signer.name} - ${signature.signerRole}`, 20, currentY);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${normalizeStatus(signature.status)}`, 20, currentY + 5);
      if (signature.signedAt) {
        doc.text(`Signed: ${new Date(signature.signedAt).toLocaleString('id-ID')}`, 20, currentY + 10);
      }
      if (signature.comments) {
        doc.text(`Comments: ${signature.comments}`, 20, currentY + 15);
      }

      currentY += 25;
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No signatures available', 20, currentY);
    currentY += 8;
  }

  // === FOOTER ===
  const footerY = pageHeight - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const footerText = aiAnalysis
    ? `Generated on ${new Date().toLocaleString('id-ID')} by QC System with AI Analysis`
    : `Generated on ${new Date().toLocaleString('id-ID')} by QC System`;
  doc.text(footerText, pageWidth / 2, footerY + 8, { align: 'center' });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
  return pdfBuffer;
}

export async function generateProjectReportPDF(projectId: string, includeAI: boolean = false, aiSettings?: any, signatureLogo?: string): Promise<Buffer> {
  // Fetch all inspections for project with proper ordering
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const inspections = await prisma.qCInspection.findMany({
      where: { projectId },
      include: {
        project: true,
        phase: true,
        inspector: true,
        items: {
          include: {
            template: true,
            attachments: true,
          },
          orderBy: {
            template: {
              code: 'asc'
            }
          }
        },
        signatures: {
          include: {
            signer: true,
          },
        },
      },
      orderBy: [
        { phase: { order: 'asc' } }, // Order by phase order first
        { createdAt: 'desc' } // Then by creation date
      ]
    });

    if (inspections.length === 0) {
      throw new Error('No inspections found for this Project');
    }

    console.log('=== PROJECT PDF GENERATION ===');
    console.log('Project ID:', projectId);
    console.log('Total Inspections:', inspections.length);
    console.log('Include AI Analysis:', includeAI);
    console.log('Signature Logo Provided:', !!signatureLogo);

    // Create PDF document for all reports
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let currentY = 20;

    // === TITLE PAGE ===
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLETE PROJECT QC REPORTS', pageWidth / 2, currentY, { align: 'center' });

    currentY += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(inspections[0].project.name, pageWidth / 2, currentY, { align: 'center' });
    doc.text(inspections[0].project.clientName, pageWidth / 2, currentY + 8, { align: 'center' });

    if (includeAI) {
      currentY += 12;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Including AI Analysis & Insights', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
    }

    // === PROJECT INFORMATION TABLE ===
    currentY += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Information', 20, currentY);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

    autoTable(doc, {
      startY: currentY + 8,
      head: [['Field', 'Value']],
      body: [
        ['Project Code', inspections[0].project.code],
        ['Project Name', inspections[0].project.name],
        ['Client Name', inspections[0].project.clientName],
        ['Location', inspections[0].project.location],
        ['Total Phases', inspections.length.toString()],
        ['Report Date', new Date().toLocaleDateString('id-ID')],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 'auto' } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // === OVERALL SUMMARY ===
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Summary', 20, currentY);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

    currentY += 10;

    const summaryData = inspections.map(inspection => [
      inspection.phase.name,
      normalizeStatus(inspection.status),
      inspection.score !== null ? inspection.score.toFixed(2) : 'N/A',
      inspection.inspector.name,
      inspection.submittedAt ? new Date(inspection.submittedAt).toLocaleDateString('id-ID') : '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Phase', 'Status', 'Score', 'Inspector', 'Date']],
      body: summaryData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        font: 'helvetica',
      },
    });

    // === DETAILED INSPECTIONS ===
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Group inspections by Phase
    const phaseGroups = inspections.reduce((groups: any[], inspection) => {
      const existingGroup = groups.find(g => g.phaseId === inspection.phaseId);

      // Use all items for this inspection, don't filter by code prefix
      // This fixes the issue where items were missing if their code didn't match the expected pattern
      const filteredItems = inspection.items;

      if (existingGroup) {
        // If group exists, add items and update metadata if this inspection is newer
        existingGroup.items = [...existingGroup.items, ...filteredItems];
        // Update metadata if this inspection is more recent (based on submittedAt or createdAt)
        const currentParamsDate = inspection.submittedAt ? new Date(inspection.submittedAt).getTime() : new Date(inspection.createdAt).getTime();
        const existingParamsDate = existingGroup.submittedAt ? new Date(existingGroup.submittedAt).getTime() : new Date(existingGroup.createdAt).getTime();

        if (currentParamsDate > existingParamsDate) {
          existingGroup.inspector = inspection.inspector;
          existingGroup.status = inspection.status;
          existingGroup.score = inspection.score;
          existingGroup.submittedAt = inspection.submittedAt;
          existingGroup.comments = inspection.comments;
        }
      } else {
        // Create new group
        groups.push({
          phaseId: inspection.phaseId,
          phaseName: inspection.phase.name,
          phaseOrder: inspection.phase.order,
          inspector: inspection.inspector,
          status: inspection.status,
          score: inspection.score,
          submittedAt: inspection.submittedAt,
          createdAt: inspection.createdAt,
          comments: inspection.comments,
          items: filteredItems
        });
      }
      return groups;
    }, []);

    // Sort groups by phase order
    phaseGroups.sort((a, b) => a.phaseOrder - b.phaseOrder);

    phaseGroups.forEach((group, groupIndex) => {
      // Check if we need a new page for each phase group
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 20;
      }

      // Phase header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');

      // Check if phase name already starts with a number (e.g. "1. Phase Name")
      const phaseName = group.phaseName;
      const hasNumbering = /^\d+\./.test(phaseName);
      const displayName = hasNumbering ? phaseName : `${groupIndex + 1}. ${phaseName}`;

      doc.text(displayName, 20, currentY);

      currentY += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Inspector: ${group.inspector.name} | Status: ${normalizeStatus(group.status)} | Score: ${group.score !== null ? group.score.toFixed(2) : 'N/A'}`, 20, currentY);
      doc.text(`Date: ${group.submittedAt ? new Date(group.submittedAt).toLocaleDateString('id-ID') : '-'}`, 20, currentY + 5);

      if (group.comments) {
        doc.text(`Comments: ${group.comments}`, 20, currentY + 10);
        currentY += 15;
      } else {
        currentY += 10;
      }

      // Items table for this phase group
      const itemsData = group.items.map((item: any) => [
        item.template.code,
        item.template.title.substring(0, 50) + (item.template.title.length > 50 ? '...' : ''),
        normalizeStatus(item.status),
        item.measuredValue || '-',
        item.isMandatory ? 'Yes' : 'No',
        item.score !== null ? item.score.toString() : '-',
      ]);

      // Sort items by code within the group
      itemsData.sort((a: string[], b: string[]) => a[0].localeCompare(b[0], undefined, { numeric: true }));

      autoTable(doc, {
        startY: currentY,
        head: [['Code', 'Item', 'Status', 'Value', 'Mandatory', 'Score']],
        body: itemsData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          font: 'helvetica',
        },
        columnStyles: {
          0: { cellWidth: 20, font: 'helvetica' }, // Code
          1: { cellWidth: 'auto', font: 'helvetica' }, // Item - auto width to fill space
          2: { cellWidth: 30, font: 'helvetica' }, // Status
          3: { cellWidth: 30, font: 'helvetica' }, // Value
          4: { cellWidth: 20, font: 'helvetica' }, // Mandatory
          5: { cellWidth: 15, font: 'helvetica' }, // Score
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    // === EXECUTIVE SUMMARY & AI ANALYSIS ===
    if (includeAI) {
      // Check if we need a new page
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive summary', 20, currentY);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);

      currentY += 10;

      // Get comprehensive project-wide AI analysis
      // If precomputed analysis is provided (from history), use it. Otherwise generate new one if settings allow.
      let projectAIAnalysis: string | null = null;

      if (typeof aiSettings === 'string') {
        // If aiSettings is actually the content string (hacky but works for now based on how we might pass it)
        // Or better, let's check the arguments.
        // The function signature needs to be updated to accept content explicitly.
        // For now, let's assume the caller passes it correctly.
      }

      if (aiSettings && typeof aiSettings === 'object' && aiSettings.content) {
        // Special case: aiSettings object contains the content directly
        projectAIAnalysis = aiSettings.content;
      } else {
        projectAIAnalysis = await getProjectAIAnalysis(inspections, aiSettings);
      }

      if (projectAIAnalysis) {
        // Set font size BEFORE splitTextToSize to ensure correct wrapping calculation
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        // AI Analysis box with background - FULL WIDTH matching table margins
        // Use pageWidth - 40 to match the table width (20mm margin on each side)
        const boxWidth = pageWidth - 40;
        // Maximize text width to fill the box, leaving small padding
        const textWidth = boxWidth - 6; // Reduced padding to 3mm on each side
        const aiLines = doc.splitTextToSize(projectAIAnalysis, textWidth);

        // Calculate available height on current page
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginBottom = 20;
        let availableHeight = pageHeight - currentY - marginBottom;

        // Render AI Analysis with pagination
        let lineIndex = 0;
        const lineHeight = 5;
        const padding = 10; // Reduced padding since icon is gone

        // Draw initial box header/background start
        // We need to handle this line by line or chunk by chunk

        // Helper to draw background rect for a chunk of lines
        const drawBackground = (y: number, height: number) => {
          doc.setFillColor(240, 248, 255); // Light blue background
          doc.rect(20, y, boxWidth, height, 'F'); // Full width
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, y, boxWidth, height); // Border
        };



        // First page chunk
        let currentBlockHeight = 0;
        let startY = currentY;
        let isFirstPage = true;

        while (lineIndex < aiLines.length) {
          // Check if we need a new page
          if (currentY + lineHeight > pageHeight - marginBottom) {
            // Draw background for the block we just finished
            // We need to redraw the text over it? No, we should draw background first.
            // Since we are iterating lines, we need a different approach.
            // Better approach: Calculate how many lines fit, draw background, then draw text.

            // Reset for new page
            doc.addPage();
            currentY = 20;
            startY = 20;
            availableHeight = pageHeight - 40;
            isFirstPage = false;
          }

          // Calculate lines that fit in remaining space
          const linesThatFit = Math.floor((pageHeight - currentY - marginBottom - (isFirstPage ? padding : 5)) / lineHeight);
          const linesToDraw = Math.min(linesThatFit, aiLines.length - lineIndex);

          if (linesToDraw <= 0) {
            doc.addPage();
            currentY = 20;
            continue;
          }

          const blockHeight = linesToDraw * lineHeight + (isFirstPage ? padding : 10);

          // Draw background for this block
          drawBackground(currentY, blockHeight);



          // Draw lines with Justified alignment
          for (let i = 0; i < linesToDraw; i++) {
            const line = aiLines[lineIndex];
            // Only justify if it's not the last line of a paragraph (heuristic: line length close to width)
            // But splitTextToSize doesn't tell us if it's a paragraph end.
            // Simple justification: use 'align: justify' with maxWidth
            // However, doc.text with justify requires maxWidth.
            // We already split the text. If we justify a short line, it looks bad.
            // Let's try to just print it. If the user says "space kosong", maybe our padding calculation was too conservative.
            // Let's reduce padding even more and use a slightly larger font or character spacing?
            // No, standard practice is Justified alignment.

            // Simple left-aligned text rendering
            // We avoid 'justify' alignment as it can be unstable with some jsPDF versions/inputs
            doc.text(line, 23, currentY + (isFirstPage ? 10 : 8) + (i * lineHeight));
            lineIndex++;
          }

          currentY += blockHeight;
          isFirstPage = false; // Next blocks are not first page of AI section
        }

        currentY += 5; // Reduced from 10 to 5
      }
    }

    // === SIGNATURES SECTION ===
    // Collect all unique signatures from all inspections
    // Ensure we are getting signatures correctly
    const allSignatures = inspections.flatMap(i => i.signatures || []);

    console.log('Total signatures found:', allSignatures.length); // Debug log

    // Calculate required space for signatures
    // Header (20) + (Signature Box (35) * count)
    // If we have a logo, we might want to display it once or for each signature?
    // Usually digital signature logo is placed inside the signature box or as a stamp.
    // Let's assume we place it in the signature box if available.

    // Reduced threshold to avoid unnecessary page breaks
    // If we have at least 60 units of space, we try to fit the header and first signature
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 5;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Digital Signatures', 20, currentY);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY + 3, pageWidth - 20, currentY + 3);
    currentY += 15;

    if (allSignatures.length > 0) {
      // Group signatures by role/signer to avoid duplicates if needed, or just list them
      // For now, listing unique signers based on email and role
      const uniqueSigners = Array.from(new Set(allSignatures.map(s => `${s.signer.email}-${s.signerRole}`)))
        .map(key => {
          const [email, role] = key.split('-');
          return allSignatures.find(s => s.signer.email === email && s.signerRole === role)!;
        });

      for (const sig of uniqueSigners) {
        // Check if we need a new page for THIS signature
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 20;
        }

        // Signature Box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.rect(20, currentY, pageWidth - 40, 30, 'FD'); // Increased height slightly for logo

        // Render Logo if available
        if (signatureLogo) {
          try {
            // Add image to PDF
            // signatureLogo is base64 string
            // We need to determine format (png/jpg)
            const format = signatureLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            // Place it on the right side, slightly transparent? jsPDF doesn't support transparency easily for images
            // Just place it.
            // x = pageWidth - 20 (margin) - 25 (width) - 5 (padding)
            doc.addImage(signatureLogo, format, pageWidth - 50, currentY + 2, 25, 25);
          } catch (e) {
            console.error('Failed to add signature logo', e);
          }
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sig.signer.name}`, 25, currentY + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(sig.signerRole, 25, currentY + 14);

        // Status Badge
        const statusColor = sig.status === 'APPROVED' ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFont('helvetica', 'bold');
        // Move status text to left of logo if logo exists, or keep at right
        const statusX = signatureLogo ? pageWidth - 60 : pageWidth - 50;
        const align = signatureLogo ? 'right' : 'left';

        // Actually let's keep it simple. Status on the left side under role?
        // Or just keep it where it was but ensure it doesn't overlap logo.
        // If logo is at pageWidth - 50 (width 25), it occupies x=160 to 185 (approx).
        // Page width A4 is 210mm. Margins 20mm. Right edge is 190mm.
        // Logo at 190 - 30 = 160.

        doc.text(normalizeStatus(sig.status), 25, currentY + 22);

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(sig.signedAt ? new Date(sig.signedAt).toLocaleDateString('id-ID') : '-', 60, currentY + 22);

        currentY += 40; // Increased spacing
      }
    } else {
      // Add a placeholder if no signatures are found, just to verify section is rendering
      // Also check for logo here if user wants to see it even without specific signatures?
      // Usually signature logo accompanies a signature.

      // If no signatures but we have a logo, maybe show a "Signed by System" or similar?
      // For now, stick to existing logic but show logo if requested.

      if (signatureLogo) {
        // Create a generic "Digital Signature" box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.rect(20, currentY, pageWidth - 40, 30, 'FD');

        const format = signatureLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(signatureLogo, format, pageWidth - 50, currentY + 2, 25, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Digitally Signed`, 25, currentY + 15);

        currentY += 40;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No digital signatures recorded for this project.', 20, currentY);
        currentY += 8;
      }
    }

    // === FOOTER ===
    const footerY = pageHeight - 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, footerY, pageWidth - 20, footerY);

    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const projectFooterText = includeAI
      ? `Generated on ${new Date().toLocaleString('id-ID')} by QC System with Comprehensive AI Analysis`
      : `Generated on ${new Date().toLocaleString('id-ID')} by QC System`;
    doc.text(projectFooterText, pageWidth / 2, footerY + 8, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    console.log('Project PDF generated successfully, buffer size:', pdfBuffer.length);
    return pdfBuffer;
  } finally {
    await prisma.$disconnect();
  }
}
