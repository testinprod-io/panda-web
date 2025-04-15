import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[OpenAI API] Request body:", body);
    
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("[OpenAI API] API Key exists:", !!apiKey);

    if (!apiKey) {
      console.error("[OpenAI API] No API key found in environment variables");
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Extract the necessary fields from the request body
    const { messages, stream, model, temperature, presence_penalty, frequency_penalty, top_p, max_tokens } = body;
    
    // Construct the OpenAI API request payload
    const openaiPayload = {
      messages,
      stream,
      model,
      ...(temperature !== undefined && { temperature }),
      ...(presence_penalty !== undefined && { presence_penalty }),
      ...(frequency_penalty !== undefined && { frequency_penalty }),
      ...(top_p !== undefined && { top_p }),
      ...(max_tokens !== undefined && { max_tokens }),
    };

    console.log("[OpenAI API] Making request to OpenAI with payload:", openaiPayload);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[OpenAI API] OpenAI error:", error);
      return NextResponse.json(error, { status: response.status });
    }

    // Handle streaming response
    if (stream) {
      // For streaming, we need to forward the response as is
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle normal response
    const data = await response.json();
    console.log("[OpenAI API] Success response:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[OpenAI API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 