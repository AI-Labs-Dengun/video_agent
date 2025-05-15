'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_DURATION = 30000; // 30 seconds
const REPLICA_ID = process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID || 'r3fbe3834a3e';
const PERSONA_ID = process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID || 'p3bb4745d4f9';

// Use a module-level ref to persist across hot reloads
const globalHasStartedRef = { current: false };
const globalConversationIdRef = { current: null as string | null };
const globalConversationUrlRef = { current: null as string | null };

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

  try {
    console.log('Making request to:', url, 'with options:', options);
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        ...options.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: response.headers
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export default function ConversationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const localHasStartedRef = useRef(false);

  const startConversation = async () => {
    // Prevent multiple API calls
    if (localHasStartedRef.current || globalHasStartedRef.current) {
      console.log('[TAVUS] Conversation already started, skipping API call.');
      return;
    }
    localHasStartedRef.current = true;
    globalHasStartedRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        endpoint: '/conversations',
        method: 'POST',
        body: {
          replica_id: REPLICA_ID,
          persona_id: PERSONA_ID,
          conversation_name: `Conversation ${Date.now()}`
        }
      };
      console.log('[TAVUS] Sending API request to /api/tavus with payload:', payload);
      
      // First, try the normal flow
      try {
        const createResponse = await fetchWithTimeout('/api/tavus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        const createData = await createResponse.json();
        console.log('[TAVUS] API response:', createData);

        // Check for ALL possible URL properties
        if (createData.conversation_url) {
          console.log('[TAVUS] Found conversation_url, redirecting to:', createData.conversation_url);
          window.location.href = createData.conversation_url;
          return;
        } else if (createData.url) {
          console.log('[TAVUS] Found url property, redirecting to:', createData.url);
          window.location.href = createData.url;
          return;
        } else if (createData.conversation_id) {
          // If we have conversation_id but no URL, construct it
          const conversationUrl = `https://tavus.daily.co/${createData.conversation_id}`;
          console.log('[TAVUS] Constructed URL from conversation_id, redirecting to:', conversationUrl);
          window.location.href = conversationUrl;
          return;
        } else if (createData.id) {
          // If we have id but no URL, construct it
          const conversationUrl = `https://tavus.daily.co/${createData.id}`;
          console.log('[TAVUS] Constructed URL from id, redirecting to:', conversationUrl);
          window.location.href = conversationUrl;
          return;
        }
      } catch (apiError) {
        console.error('[TAVUS] Initial API error:', apiError);
        // Continue to fallback approach
      }

      // FALLBACK: If we reach here, try to create conversation and check the response even if it's an error
      try {
        const rawResponse = await fetch('/api/tavus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        // Get the raw response text first
        const responseText = await rawResponse.text();
        console.log('[TAVUS] Raw API response:', responseText);
        
        // Try to parse as JSON
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('[TAVUS] Parsed response data:', responseData);
        } catch (e) {
          console.error('[TAVUS] Failed to parse response as JSON:', e);
        }
        
        // If we have any ID in the response, try to use it
        if (responseData && (responseData.conversation_id || responseData.id)) {
          const id = responseData.conversation_id || responseData.id;
          const conversationUrl = `https://tavus.daily.co/${id}`;
          console.log('[TAVUS] Fallback: Constructed URL from id, redirecting to:', conversationUrl);
          window.location.href = conversationUrl;
          return;
        }

        // If we still don't have a URL, check if id is in the params
        if (params.id) {
          const conversationUrl = `https://tavus.daily.co/${params.id}`;
          console.log('[TAVUS] Last resort: Using params.id for URL, redirecting to:', conversationUrl);
          window.location.href = conversationUrl;
          return;
        }
        
        // If all else fails, throw an error
        throw new Error('Could not determine conversation URL from response');
        
      } catch (fallbackError) {
        console.error('[TAVUS] Fallback approach also failed:', fallbackError);
        throw fallbackError;
      }
    } catch (err) {
      console.error('[TAVUS] All attempts to create conversation failed:', err);
      
      // LAST RESORT: Try using a hardcoded link as example
      const hardcodedUrl = `https://tavus.daily.co/ce985fc048ad`;
      console.log('[TAVUS] ⚠️ ALL ATTEMPTS FAILED - Using hardcoded URL as last resort:', hardcodedUrl);
      window.location.href = hardcodedUrl;
      
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setIsLoading(false);
      // Allow retry if there was an error
      localHasStartedRef.current = false;
      globalHasStartedRef.current = false;
    }
  };

  useEffect(() => {
    console.log('[TAVUS] Component mounted, starting conversation');
    startConversation();
    return () => {
      console.log('[TAVUS] Component unmounting, resetting local state');
      localHasStartedRef.current = false;
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-auth-gradient">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
            Tavus Conversation
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {isLoading && (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300">
                  Starting conversation...
                </p>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 