"use client";
import React, { useState, useRef } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { FaRegThumbsUp, FaRegThumbsDown, FaMicrophone, FaPaperPlane, FaUserCircle, FaRobot, FaCog, FaRegCommentDots, FaVolumeUp, FaRegSmile } from 'react-icons/fa';
import { useTheme } from '../providers/ThemeProvider';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';

// Message type
interface Message {
  id: string;
  content: string;
  user: 'me' | 'bot';
  created_at: string;
}

// Modal for adding a comment
function CommentModal({ open, onClose, message, onSubmit }: { open: boolean, onClose: () => void, message: { id: string, content: string }, onSubmit: (comment: string) => void }) {
  const [comment, setComment] = useState('');
  React.useEffect(() => { if (!open) setComment(''); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="rounded-2xl shadow-2xl p-6 w-[95vw] max-w-md bg-gradient-to-br from-pink-300 via-blue-200 to-blue-100 dark:bg-gradient-to-br dark:from-[#9133e7] dark:via-[#541d85] dark:to-[#1c2458] relative">
        <button className="absolute top-4 right-4 text-white/70 hover:text-white text-xl" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold text-white dark:text-white mb-4">Add Comment</h2>
        <div className="mb-4 p-3 rounded-lg bg-white/10 dark:bg-white/10 text-white dark:text-white text-sm">{message.content}</div>
        <textarea
          className="w-full min-h-[80px] rounded-lg p-3 bg-white/20 dark:bg-white/10 text-white dark:text-white placeholder-white/60 outline-none border border-white/30 mb-4 resize-none"
          placeholder="Write your comment..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 rounded text-white/80 hover:text-white" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded bg-white/30 dark:bg-white/10 text-white/80 font-semibold disabled:opacity-40"
            disabled={!comment.trim()}
            onClick={() => { onSubmit(comment); onClose(); }}
          >Submit</button>
        </div>
      </div>
    </div>
  );
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | undefined>>({});
  // Add state for comment modal
  const [commentModal, setCommentModal] = useState<{ open: boolean, message?: { id: string, content: string } }>({ open: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when AI responds
  React.useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

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

  const handleFeedback = async (messageId: string, type: 'like' | 'dislike', content: string) => {
    setFeedback((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === type ? undefined : type,
    }));
    // Send feedback to API
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, type, content }),
      });
    } catch (e) {
      // Optionally handle error
    }
  };

  // Speech synthesis for reading messages aloud (choose best available Portuguese voice)
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = 'pt-PT';
      const voices = window.speechSynthesis.getVoices();
      // Prefer Google/Microsoft Portuguese voices
      const preferred = voices.find(v =>
        v.lang?.toLowerCase().startsWith('pt') &&
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('microsoft'))
      );
      // Otherwise, pick any Portuguese voice
      const fallback = voices.find(v => v.lang?.toLowerCase().startsWith('pt'));
      utter.voice = preferred || fallback || null;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleComment = async (messageId: string, content: string, comment: string) => {
    try {
      await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content, comment }),
      });
    } catch (e) {}
  };

  // Insert emoji at cursor position
  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newValue = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(newValue);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  if (!user) return null;

  return (
    <div className="bg-auth-gradient min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-white/30">
        <header className="p-6 flex justify-between items-center relative border-b border-white/20">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white drop-shadow">Assistente IA</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-white/80">{user.email}</span>
            <div className="relative">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none"
                aria-label="Abrir configurações"
              >
                <FaCog className="text-xl" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#23234a] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-2 px-4 py-3 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-[#181830] rounded-t-xl"
                  >
                    {dark ? (
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 text-yellow-400'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0l-1.414-1.414M6.05 6.05L4.636 4.636' />
                        <circle cx='12' cy='12' r='5' fill='currentColor' />
                      </svg>
                    ) : (
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 text-gray-700 dark:text-white'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z' />
                      </svg>
                    )}
                    {dark ? 'Modo Claro' : 'Modo Escuro'}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#181830] rounded-b-xl"
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V9m7.5 0v10.5A2.25 2.25 0 0113.5 21h-3a2.25 2.25 0 01-2.25-2.25V9m7.5 0H18a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0118 21h-12a2.25 2.25 0 01-2.25-2.25v-7.5A2.25 2.25 0 016 9h1.5' />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.user === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.user === 'bot' && (
                  <div className="flex flex-col items-end mr-2 justify-center">
                    <FaRobot className="text-3xl text-blue-600 dark:text-blue-200" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-5 py-3 border-[0.5px] border-white text-white bg-transparent max-w-[70%] min-w-[100px] text-base ${
                    msg.user === 'me' ? 'ml-2' : 'mr-2'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span>{msg.content}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 relative">
                    {msg.user === 'bot' && (
                      <>
                        <button
                          className={`transition-colors ${feedback[msg.id] === 'like' ? 'text-green-400' : 'text-white opacity-80'} hover:text-green-400`}
                          onClick={() => handleFeedback(msg.id, 'like', msg.content)}
                        >
                          <FaRegThumbsUp className="text-lg" />
                        </button>
                        <button
                          className={`transition-colors ${feedback[msg.id] === 'dislike' ? 'text-red-400' : 'text-white opacity-80'} hover:text-red-400`}
                          onClick={() => handleFeedback(msg.id, 'dislike', msg.content)}
                        >
                          <FaRegThumbsDown className="text-lg" />
                        </button>
                        <button className="hover:text-blue-300 transition-colors" onClick={() => speak(msg.content)}><FaVolumeUp className="text-lg text-white opacity-80" /></button>
                        <button className="hover:text-blue-300 transition-colors" onClick={() => setCommentModal({ open: true, message: { id: msg.id, content: msg.content } })}><FaRegCommentDots className="text-lg text-white opacity-80" /></button>
                      </>
                    )}
                    <span className="absolute bottom-0 right-2 text-xs opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                {msg.user === 'me' && (
                  <div className="flex flex-col items-end ml-2 justify-center">
                    <FaUserCircle className="text-3xl text-white" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>
        <footer className="w-full p-6 border-t border-white/20">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 bg-transparent rounded-2xl px-4 py-2 shadow-md border border-white/30"
          >
            <div className="relative">
              <button
                type="button"
                className="text-xl text-blue-600 dark:text-blue-200 hover:text-blue-400"
                onClick={() => setShowEmojiPicker((v) => !v)}
                tabIndex={-1}
              >
                <FaRegSmile />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-50">
                  <Picker
                    data={emojiData}
                    theme={dark ? 'dark' : 'light'}
                    onEmojiSelect={(e: any) => {
                      insertEmoji(e.native);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Envie uma mensagem..."
              className="flex-1 bg-transparent outline-none px-2 py-2 text-white dark:text-white placeholder-gray-200 dark:placeholder-gray-300"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
              style={{ background: 'transparent' }}
              onBlur={() => setTimeout(() => setShowEmojiPicker(false), 200)}
            />
            <button
              type="submit"
              className="text-xl text-blue-600 dark:text-blue-200 hover:text-blue-400 disabled:opacity-50"
              disabled={!newMessage.trim() || loading}
            >
              <FaPaperPlane />
            </button>
            <button type="button" className="text-xl text-blue-600 dark:text-blue-200 hover:text-blue-400 ml-1">
              <FaMicrophone />
            </button>
          </form>
        </footer>
      </div>
      <CommentModal
        open={commentModal.open}
        onClose={() => setCommentModal({ open: false })}
        message={commentModal.message || { id: '', content: '' }}
        onSubmit={comment => commentModal.message && handleComment(commentModal.message.id, commentModal.message.content, comment)}
      />
    </div>
  );
};

export default Chat; 