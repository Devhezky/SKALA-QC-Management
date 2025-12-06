import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface QCData {
  projectName: string;
  phaseName: string;
  score: number;
  completedItems: number;
  totalItems: number;
  criticalItems: number;
  items: Array<{
    name: string;
    score: number;
    status: string;
    notes?: string;
    photos?: string[];
  }>;
  inspectorNotes?: string;
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      qcData,
      apiKey,
      provider = 'openai',
      model = provider === 'openai' ? 'gpt-4-turbo' : 'glm-4.5',
      temperature = 0.7,
      maxTokens = 2000
    } = await request.json();

    if (!qcData || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'QC data and API key are required' },
        { status: 400 }
      );
    }

    console.log('=== AI ANALYSIS REQUEST ===');
    console.log('Provider:', provider);
    console.log('Model:', model);
    console.log('Project:', qcData.projectName);
    console.log('Phase:', qcData.phaseName);
    console.log('Score:', qcData.score);

    let analysisResult;

    if (provider === 'openai') {
      analysisResult = await analyzeWithOpenAI(qcData, apiKey, model, temperature, maxTokens);
    } else if (provider === 'glm') {
      analysisResult = await analyzeWithGLM(qcData, apiKey, model, temperature, maxTokens);
    } else if (provider === 'gemini') {
      analysisResult = await analyzeWithGemini(qcData, apiKey, model, temperature, maxTokens);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported AI provider' },
        { status: 400 }
      );
    }

    // Save analysis to database if projectId is present
    if (qcData.projectId && analysisResult.success) {
      try {
        await db.projectAnalysis.create({
          data: {
            projectId: qcData.projectId,
            content: analysisResult.analysis,
            provider: provider,
            model: model,
            score: qcData.score
          }
        });
      } catch (dbError) {
        console.error('Failed to save analysis to database:', dbError);
        // Don't fail the request if saving fails, just log it
      }
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function analyzeWithOpenAI(
  qcData: QCData,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number
) {
  try {
    const prompt = generatePrompt(qcData);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah QC Inspector Verifier. Tugasmu memberikan kesimpulan atas pekerjaan inspektur QC. Gunakan bahasa Indonesia Casual Formal yang mudah dimengerti. Jika ada item tidak lolos, fokus pada alasan dan solusi detil, terperinci, dan tegas.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API Error:', errorData);
      return {
        success: false,
        error: `OpenAI API Error: ${errorData.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis available';

    console.log('OpenAI Analysis completed');

    return {
      success: true,
      analysis: analysis,
      provider: 'openai',
      model: model,
      metadata: {
        projectName: qcData.projectName,
        phaseName: qcData.phaseName,
        score: qcData.score,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
    };
  }
}

async function analyzeWithGLM(
  qcData: QCData,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number
) {
  try {
    const prompt = generatePrompt(qcData);

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah QC Inspector Verifier. Tugasmu memberikan kesimpulan atas pekerjaan inspektur QC. Gunakan bahasa Indonesia Casual Formal yang mudah dimengerti. Jika ada item tidak lolos, fokus pada alasan dan solusi detil, terperinci, dan tegas.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GLM API Error:', errorData);
      return {
        success: false,
        error: `GLM API Error: ${errorData.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis available';

    console.log('GLM Analysis completed');

    return {
      success: true,
      analysis: analysis,
      provider: 'glm',
      model: model,
      metadata: {
        projectName: qcData.projectName,
        phaseName: qcData.phaseName,
        score: qcData.score,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('GLM Analysis Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown GLM error',
    };
  }
}

async function analyzeWithGemini(
  qcData: QCData,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number
) {
  try {
    const prompt = generatePrompt(qcData);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Kamu adalah QC Inspector Verifier. Tugasmu memberikan kesimpulan atas pekerjaan inspektur QC. Gunakan bahasa Indonesia Casual Formal yang mudah dimengerti. Jika ada item tidak lolos, fokus pada alasan dan solusi detil, terperinci, dan tegas.\n\n' + prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      return {
        success: false,
        error: `Gemini API Error: ${errorData.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    console.log('Gemini Analysis completed');

    return {
      success: true,
      analysis: analysis,
      provider: 'gemini',
      model: model,
      metadata: {
        projectName: qcData.projectName,
        phaseName: qcData.phaseName,
        score: qcData.score,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Gemini error',
    };
  }
}

function generatePrompt(qcData: QCData): string {
  const criticalIssues = qcData.items.filter(item => item.status === 'NOT_OK' || item.score < 70);

  return `
Tolong bertindak sebagai QC Inspector Verifier. Analisis data inspeksi berikut:

DATA PROYEK:
- Proyek: ${qcData.projectName}
- Fase: ${qcData.phaseName}
- Skor: ${qcData.score}%
- Progress: ${qcData.completedItems}/${qcData.totalItems} item
- Isu Kritis: ${qcData.criticalItems}
- Catatan Umum Inspektur: ${qcData.inspectorNotes || '-'}

DETAIL ITEM YANG PERLU PERHATIAN (BELUM LOLOS/KRITIS):
${criticalIssues.length > 0 ? criticalIssues.map(item =>
    `- Item: ${item.name}
      Status: ${item.status} (Skor: ${item.score}%)
      Catatan Inspektur: ${item.notes || 'Tidak ada catatan'}`
  ).join('\n') : '- Tidak ada isu kritis ditemukan.'}

INSTRUKSI ANALISIS:
1. Berikan kesimpulan umum tentang kualitas pekerjaan berdasarkan data di atas.
2. UNTUK SETIAP ITEM YANG BELUM LOLOS/KRITIS:
   - Analisis kenapa hal tersebut bisa terjadi (baca baik-baik Catatan Inspektur).
   - Berikan SOLUSI yang DETIL, TERPERINCI, dan TEGAS. Apa langkah konkret yang harus dilakukan untuk memperbaikinya?
3. Gunakan bahasa Indonesia Casual Formal (enak dibaca, tidak kaku, tapi tetap profesional dan tegas).
4. Format jawaban dengan rapi menggunakan poin-poin.
  `.trim();
}
