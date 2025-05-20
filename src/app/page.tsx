'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_DURATION = 30000; // 30 seconds
const REPLICA_ID = process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID || 'r3fbe3834a3e';
const PERSONA_ID = process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID || 'p3bb4745d4f9';

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
              conversation_name: "Mapro Assistant",
              conversational_context: `Company Information:
Company Name: Mapro Real Estate
Address: Av. Alm. Mendes Cabeçadas, Edifício Mapro, 8135-106 Almancil, Algarve, Portugal
Phone: (+351) 289 390 880
Email: info@maprorealestate.com
Website: www.maprorealestate.com

Business Overview:
Mapro Real Estate specializes in luxury residential properties in the Algarve, offering high-end villas, townhouses, apartments, and investment properties. The company provides tailored real estate services, including property matchmaking, legal and financial guidance, and market insights. Mapro Real Estate is an official co-branded associate of Knight Frank, granting access to exclusive listings and a global network of buyers and sellers.

Key Services:
- Property Sales & Listings: Luxury properties in prime Algarve locations, including off-market options
- Buyer & Seller Consultation: Personalized property searches, transaction guidance, and legal/financial support
- Investment & Market Insights: Data on price trends, rental yield, and long-term appreciation

AI Assistant Capabilities:
1. Property Matchmaking (Casafari API Integration):
- Location-Based Searches: Properties near schools, golf courses, beaches, and landmarks
- Property Type & Features: Villas, townhouses, apartments, plots with various amenities
- Budget & Investment Potential: Price ranges from €500K to €10M+, with rental yield insights

2. Customer Service & General Inquiries:
- Property Viewings: By appointment only, Monday to Saturday
- Legal & Tax Information: Foreign buyer guidance, buying costs, Golden Visa eligibility
- Mortgage & Financing: Up to 70% LTV for non-residents
- Company Services: Access to off-market listings, multiple communication channels

3. Market Insights & Investment Advice:
- Algarve Real Estate Trends: Property value appreciation in key areas
- Investment Potential: 4-7% annual rental yields, strong long-term growth

Operating Hours:
- Monday to Friday: 9:00 AM - 6:00 PM (GMT)
- Saturday: 10:00 AM - 2:00 PM (GMT)
- Closed on Sundays and Public Holidays

Team Members:
- Suzana Bento – Director
- Sandra Neves – Senior Consultant
- Sam Remus – Sales Consultant
- Fred Macieira – Sales Consultant
- Filipa Silva – Administration
- Brad Smith – Brand Ambassador`,
              properties: {
                enable_recording: true
              }
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
