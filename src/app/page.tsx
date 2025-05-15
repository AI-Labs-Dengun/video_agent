'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT_DURATION = 30000; // 30 seconds
const REPLICA_ID = 'r3fbe3834a3e';
const PERSONA_ID = 'p3bb4745d4f9';

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

  try {
    console.log(`Attempting to fetch ${url} (${retries} retries remaining)`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`API Error: ${response.status}`, errorData);
      throw new Error(`API Error: ${response.status} ${errorData?.message || response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      console.error(`Fetch error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out after', TIMEOUT_DURATION, 'ms');
        throw new Error('Request timed out');
      }
    }

    if (retries > 0) {
      const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries); // Exponential backoff
      console.log(`Retrying in ${delay}ms... ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithRetry(
        '/api/tavus',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: '/conversations',
            body: {
              replica_id: REPLICA_ID,
              persona_id: PERSONA_ID,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Failed to start conversation: ${response.status} ${errorData?.message || response.statusText}`);
      }

      const data = await response.json();
      router.push(`/conversation/${data.conversation_id}`);
    } catch (err) {
      console.error('Error starting conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-auth-gradient">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
            Tavus Conversation
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={startConversation}
              disabled={isLoading}
              className="auth-button w-full"
            >
              {isLoading ? 'Starting...' : 'Start New Conversation'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
