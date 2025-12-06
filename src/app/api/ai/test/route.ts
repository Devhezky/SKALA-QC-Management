import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, provider = 'openai', model } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    console.log('=== AI TEST CONNECTION ===');
    console.log('Provider:', provider);
    console.log('Model:', model);

    let testResult;

    if (provider === 'openai') {
      testResult = await testOpenAI(apiKey, model);
    } else if (provider === 'glm') {
      testResult = await testGLM(apiKey, model);
    } else if (provider === 'gemini') {
      testResult = await testGemini(apiKey, model);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported AI provider' },
        { status: 400 }
      );
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing AI connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function testOpenAI(apiKey: string, model: string = 'gpt-4-turbo') {
  try {
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
            role: 'user',
            content: 'Hello! This is a test message. Please respond with "OpenAI connection successful" to confirm the connection is working.',
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
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
    const message = data.choices?.[0]?.message?.content || 'No response received';

    console.log('OpenAI Test Response:', message);

    return {
      success: true,
      message: `OpenAI connection successful! Model: ${model}`,
      provider: 'openai',
      model: model,
      testResponse: message,
    };
  } catch (error) {
    console.error('OpenAI Test Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
    };
  }
}

async function testGLM(apiKey: string, model: string = 'glm-4.5') {
  try {
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
            role: 'user',
            content: 'Hello! This is a test message. Please respond with "GLM connection successful" to confirm the connection is working.',
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
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
    const message = data.choices?.[0]?.message?.content || 'No response received';

    console.log('GLM Test Response:', message);

    return {
      success: true,
      message: `GLM connection successful! Model: ${model}`,
      provider: 'glm',
      model: model,
      testResponse: message,
    };
  } catch (error) {
    console.error('GLM Test Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown GLM error',
    };
  }
}

async function testGemini(apiKey: string, model: string = 'gemini-1.5-flash') {
  try {
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
                text: 'Hello! This is a test message. Please respond with "Gemini connection successful" to confirm the connection is working.',
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1,
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
    const message = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';

    console.log('Gemini Test Response:', message);

    return {
      success: true,
      message: `Gemini connection successful! Model: ${model}`,
      provider: 'gemini',
      model: model,
      testResponse: message,
    };
  } catch (error) {
    console.error('Gemini Test Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Gemini error',
    };
  }
}
