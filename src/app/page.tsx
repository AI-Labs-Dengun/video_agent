'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_DURATION = 30000; // 30 seconds
const REPLICA_ID = 'r3fbe3834a3e';
const PERSONA_ID = 'p3bb4745d4f9';

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API Error: ${response.status} ${errorData?.message || response.statusText}`);
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
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

      const response = await fetchWithTimeout(
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

      const data = await response.json();
      if (!data.conversation_id) {
        throw new Error(`Failed to start conversation: ${data.error || data.message || 'Unknown error'}`);
      }
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
