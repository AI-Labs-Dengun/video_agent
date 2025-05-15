import { NextRequest, NextResponse } from 'next/server';

const TAVUS_API_BASE = 'https://api.tavus.io/v1';

export async function POST(req: NextRequest) {
  try {
    const { endpoint, method = 'POST', body } = await req.json();
    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey) {
      console.error('Tavus API key is not configured');
      return NextResponse.json(
        { error: 'API key not configured. Please set TAVUS_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    console.log(`Making ${method} request to ${TAVUS_API_BASE}${endpoint}`);
    
    const response = await fetch(`${TAVUS_API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Tavus API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
        endpoint: `${TAVUS_API_BASE}${endpoint}`
      });
      return NextResponse.json(
        { error: data.message || 'API request failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Tavus API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');
    const apiKey = process.env.TAVUS_API_KEY;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      console.error('Tavus API key is not configured');
      return NextResponse.json(
        { error: 'API key not configured. Please set TAVUS_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    console.log(`Making GET request to ${TAVUS_API_BASE}${endpoint}`);

    const response = await fetch(`${TAVUS_API_BASE}${endpoint}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Tavus API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
        endpoint: `${TAVUS_API_BASE}${endpoint}`
      });
      return NextResponse.json(
        { error: data.message || 'API request failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Tavus API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 