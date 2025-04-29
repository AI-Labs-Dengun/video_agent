"use client";
import React, { useState, useRef } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { FaRegThumbsUp, FaRegThumbsDown, FaMicrophone, FaPaperPlane, FaUserCircle, FaRobot } from 'react-icons/fa';
import { useTheme } from '../providers/ThemeProvider';

// Message type
interface Message {
  id: string;
  content: string;
  user: 'me' | 'bot';
  created_at: string;
}

const Chat = () => {
  const { user, signOut } = useSupabase();
  const { dark, toggleTheme } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: 'Olá! Seja bem-vindo ao nosso chat. Como posso ajudá-lo hoje?',
      user: 'bot',
      created_at: new Date().toISOString(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push('/sign-in');
    }
  }, [user, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      content: newMessage,
      user: 'me',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage('');
    setLoading(true);
    // Call ChatGPT API
    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || 'Desculpe, não consegui responder agora.',
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: 'Erro ao conectar ao ChatGPT.',
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  if (!user) return null;

  return (
    <div className="bg-auth-gradient flex flex-col h-screen">
      <header className="p-4 flex justify-between items-center bg-transparent relative">
        <h1 className="text-2xl font-bold text-white drop-shadow">Assistente IA</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/80">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm text-white"
          >
            Sair
          </button>
        </div>
        <button
          className="absolute top-4 right-4 bg-white/40 rounded-full p-2 hover:bg-white/60 transition-colors"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          type="button"
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0l-1.414-1.414M6.05 6.05L4.636 4.636" />
              <circle cx="12" cy="12" r="5" fill="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
            </svg>
          )}
        </button>
      </header>
      <main className="flex-1 px-0 py-2 overflow-y-auto">
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.user === 'bot' && (
                <div className="flex flex-col items-end mr-2">
                  <div className="bg-white/30 rounded-full p-2 mb-1">
                    <FaRobot className="text-2xl text-white" />
                  </div>
                </div>
              )}
              <div
                className={`rounded-2xl px-5 py-3 shadow-md relative max-w-[70vw] min-w-[120px] ${
                  msg.user === 'me'
                    ? 'bg-white/80 text-gray-800 rounded-br-none'
                    : 'bg-white/20 text-white rounded-bl-none'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{msg.content}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.user === 'bot' && (
                    <>
                      <button className="hover:text-green-400"><FaRegThumbsUp className="text-white" /></button>
                      <button className="hover:text-red-400"><FaRegThumbsDown className="text-white" /></button>
                    </>
                  )}
                </div>
              </div>
              {msg.user === 'me' && (
                <div className="flex flex-col items-end ml-2">
                  <div className="bg-white/80 rounded-full p-2 mb-1">
                    <FaUserCircle className="text-2xl text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="w-full max-w-2xl mx-auto p-4 pb-6">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-3 bg-white/40 rounded-2xl px-4 py-2 shadow-md"
        >
          <button type="button" className="text-xl text-white hover:text-blue-200">
            <FaMicrophone className="text-white" />
          </button>
          <input
            type="text"
            placeholder="Envie uma mensagem..."
            className="flex-1 bg-transparent outline-none px-2 py-2 text-white placeholder-gray-200"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="text-xl text-white hover:text-blue-200 disabled:opacity-50"
            disabled={!newMessage.trim() || loading}
          >
            <FaPaperPlane className="text-white" />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default Chat; 