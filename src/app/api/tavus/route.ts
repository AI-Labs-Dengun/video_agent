import { NextRequest, NextResponse } from 'next/server';

const TAVUS_API_BASE = 'https://tavusapi.com/v2';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.TAVUS_API_KEY;
    if (!apiKey) {
      console.error('Tavus API key is not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { endpoint, method = 'POST', body: requestBody } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Normalize endpoint path
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${TAVUS_API_BASE}${normalizedEndpoint}`;

    console.log('Making request to Tavus:', {
      url,
      method,
      body: requestBody
    });

    const response = await fetch(url, {
      method,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Tavus API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      return NextResponse.json(
        { error: data.message || 'Failed to process request' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Tavus API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TAVUS_API_KEY;
    if (!apiKey) {
      console.error('Tavus API key is not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Normalize endpoint path
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${TAVUS_API_BASE}${normalizedEndpoint}`;

    console.log('Making request to Tavus:', {
      url,
      method: 'GET'
    });

    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Tavus API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      return NextResponse.json(
        { error: data.message || 'Failed to process request' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Tavus API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 