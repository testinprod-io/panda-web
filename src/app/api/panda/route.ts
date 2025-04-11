import { NextRequest, NextResponse } from 'next/server';

const PANDA_BASE_URL = "http://20.115.208.193:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get("Authorization")?.split(" ")[1] || "API_KEY";

    console.log("[Panda Proxy] Forwarding request to:", `${PANDA_BASE_URL}/v1/chat/completions`);
    console.log("[Panda Proxy] Request body:", body);
    console.log("[Panda Proxy] API Key:", apiKey);

    const response = await fetch(`${PANDA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    console.log("[Panda Proxy] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Panda Proxy] Error response:", errorText);
      return NextResponse.json(
        { error: `Panda API error: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    // For streaming responses, we need to forward the response as is
    if (body.stream) {
      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // For non-streaming responses, we can parse and return the JSON
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Panda Proxy] Error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("Authorization")?.split(" ")[1] || "API_KEY";

    console.log("[Panda Proxy] Forwarding GET request to:", `${PANDA_BASE_URL}/v1/models`);
    console.log("[Panda Proxy] API Key:", apiKey);

    const response = await fetch(`${PANDA_BASE_URL}/v1/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    console.log("[Panda Proxy] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Panda Proxy] Error response:", errorText);
      return NextResponse.json(
        { error: `Panda API error: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Panda Proxy] Error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
} 