"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { FaRegThumbsUp, FaRegThumbsDown, FaMicrophone, FaPaperPlane, FaUserCircle, FaRobot, FaCog, FaRegCommentDots, FaVolumeUp, FaRegSmile, FaStop } from 'react-icons/fa';
import { useTheme } from '../providers/ThemeProvider';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import TypewriterEffect from 'react-typewriter-effect';
import { useLanguage } from '../../lib/LanguageContext';
import { useTranslation } from '../../lib/i18n';

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

// Voice modal component
function VoiceModal({ open, mode, onClose, onToggleRecord }: {
  open: boolean,
  mode: 'ai-speaking' | 'ready-to-record' | 'recording',
  onClose: () => void,
  onToggleRecord: () => void,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      <div className="rounded-2xl shadow-2xl p-6 w-[95vw] max-w-md bg-gradient-to-br from-purple-700 to-purple-900 relative">
        <button className="absolute top-4 right-4 text-white/70 hover:text-white text-xl z-10" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold text-white mb-4">Chat por Voz</h2>
        <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
          <div className="bg-purple-500 rounded-full p-2">
            <FaUserCircle className="text-3xl text-white" />
          </div>
          <div>
            <div className="text-white font-semibold">
              {mode === 'ai-speaking' ? 'Assistente' : 'Você'}
            </div>
            <div className="text-white/80 text-sm">
              {mode === 'ai-speaking' ? 'Falando' : mode === 'ready-to-record' ? 'Pronto para gravar' : 'A Gravar'}
            </div>
          </div>
          <div className="ml-auto">
            {mode === 'ai-speaking' && (
              <span className="text-white/80 text-2xl">🔊</span>
            )}
            {(mode === 'ready-to-record' || mode === 'recording') && (
              <button
                className={`text-white/80 text-2xl rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white ${mode === 'ready-to-record' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={onToggleRecord}
                type="button"
              >
                {mode === 'ready-to-record' ? <FaMicrophone /> : <FaStop />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to map language code to language name
const languageNames: Record<string, string> = {
  en: 'English',
  pt: 'Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

const Chat = () => {
  const { user, signOut } = useSupabase();
  const { dark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | undefined>>({});
  // Add state for comment modal
  const [commentModal, setCommentModal] = useState<{ open: boolean, message?: { id: string, content: string } }>({ open: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceMode, setVoiceMode] = useState<'idle' | 'recording' | 'ai-speaking'>('idle');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  // Add state for voice modal mode
  const [voiceModalMode, setVoiceModalMode] = useState<'ai-speaking' | 'ready-to-record' | 'recording'>('ai-speaking');
  const [greetingLoading, setGreetingLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [ttsLoadingMsgId, setTtsLoadingMsgId] = useState<string | null>(null);
  const [tooltips, setTooltips] = useState<string[]>([]);
  const [showTooltips, setShowTooltips] = useState(true);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 100; // px from bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(atBottom);
  };

  // Scroll to bottom when messages change, but only if user is near the bottom
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

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

  // Replace the static initial message logic
  useEffect(() => {
    if (messages.length === 0) {
      setGreetingLoading(true);
      (async () => {
        try {
          // Fetch both instructions and knowledge files from public directory
          const [instructionsRes, knowledgeRes] = await Promise.all([
            fetch('/AI_INSTRUCTIONS.md'),
            fetch('/AI_KNOWLEDGE.md'),
          ]);
          const instructionsText = await instructionsRes.text();
          const knowledgeText = await knowledgeRes.text();
          console.log('Instructions:', instructionsText);
          console.log('Knowledge:', knowledgeText);
          // Use a specific, creative prompt for the greeting based on the current language
          const greetingPrompt = `Generate a creative, warm, and original greeting for a new user in ${language}. Use the INSTRUCTIONS to define the tone and style of the message, and the KNOWLEDGE BASE to incorporate specific information about Dengun and its services. Be original and do not copy any examples from the instructions. The greeting should reflect Dengun's professional and welcoming personality, mentioning some of the main services and inviting the user to explore how we can help. Keep your answer very short (1-2 sentences).`;
          console.log('Prompt sent to API:', greetingPrompt);
          const res = await fetch('/api/chatgpt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: greetingPrompt }),
          });
          const data = await res.json();
          console.log('API response:', data);
          setMessages([
            {
              id: 'welcome',
              content: data.reply && data.reply.trim() ? data.reply : t('chat.greeting'),
              user: 'bot',
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (err) {
          setMessages([
            {
              id: 'welcome',
              content: t('chat.greeting'),
              user: 'bot',
              created_at: new Date().toISOString(),
            },
          ]);
        } finally {
          setGreetingLoading(false);
        }
      })();
    }
    // eslint-disable-next-line
  }, [language]);

  // Select 4 random tooltips on chat open or language change
  useEffect(() => {
    if (messages.length === 0) {
      let allTooltips: string[] = [];
      const tt = t('chat.tooltips');
      if (Array.isArray(tt)) {
        allTooltips = tt;
      }
      const shuffled = [...allTooltips].sort(() => 0.5 - Math.random());
      setTooltips(shuffled.slice(0, 4));
      setShowTooltips(true);
    }
  }, [language, messages.length]);

  // Hide tooltips on first interaction
  const handleFirstInteraction = () => {
    if (showTooltips) setShowTooltips(false);
  };

  // Play TTS audio for AI response (used for explicit voice mode with modal)
  const playTTS = async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') return;
    setVoiceModalMode('ai-speaking');
    setVoiceModalOpen(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setVoiceModalMode('ready-to-record');
        if (onEnd) onEnd();
      };
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setVoiceModalMode('ready-to-record');
      if (onEnd) onEnd();
    }
  };

  // Play TTS audio for bot messages without opening the modal (auto-read)
  const speakBotMessage = async (text: string) => {
    if (typeof window === 'undefined') return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    handleFirstInteraction();
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
    // Always instruct the AI to answer ONLY in the selected language, not mention language, and keep it short
    const prompt = `${newMessage}\n\nPlease answer ONLY in ${languageNames[language] || 'English'}, regardless of the language of the question. Do not mention language or your ability to assist in other languages. Keep your answer short and concise.`;
    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || t('chat.greeting'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: t('common.error'),
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
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
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

  // Add voice recording logic
  const startRecording = async () => {
    if (typeof window === 'undefined') return;
    setVoiceModalMode('recording');
    setVoiceModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      // Set onstop handler BEFORE starting
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        setVoiceModalMode('ai-speaking'); // temporarily set to ai-speaking while waiting
        setVoiceMode('idle');
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.wav');
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          console.log('Transcription result:', data);
          if (data.text) {
            // Auto-send the transcribed message
            const userMsg = {
              id: 'user-' + Date.now(),
              content: data.text,
              user: 'me' as 'me',
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, userMsg]);
            setLoading(true);
            try {
              const res = await fetch('/api/chatgpt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: data.text }),
              });
              const aiData = await res.json();
              setMessages((prev) => [
                ...prev,
                {
                  id: 'bot-' + Date.now(),
                  content: aiData.reply || 'Desculpe, não consegui responder agora.',
                  user: 'bot',
                  created_at: new Date().toISOString(),
                },
              ]);
              // After AI response, play TTS and loop
              if (aiData.reply) {
                playTTS(aiData.reply, () => {
                  setVoiceModalMode('ready-to-record');
                });
              } else {
                setVoiceModalMode('ready-to-record');
              }
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
              setVoiceModalMode('ready-to-record');
            } finally {
              setLoading(false);
            }
          } else {
            setVoiceModalMode('ready-to-record');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setVoiceModalMode('ready-to-record');
        }
      };
      mediaRecorder.start();
    } catch (err) {
      console.error('Recording error:', err);
      setVoiceModalMode('ready-to-record');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // In Chat component, add a handler for toggling record/stop
  const handleToggleRecord = () => {
    handleFirstInteraction();
    if (voiceModalMode === 'ready-to-record') {
      startRecording();
    } else if (voiceModalMode === 'recording') {
      stopRecording();
    }
  };

  const handleVoiceModalClose = () => {
    setVoiceModalOpen(false);
    setVoiceModalMode('ai-speaking');
    setVoiceMode('idle');
    // Stop TTS playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Stop recording if active
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // When a new bot message is added, estimate typewriter duration and set isTypewriterActive
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[messages.length - 1].user === 'bot'
    ) {
      // Estimate duration: (message length * typeSpeed) + startDelay
      const typeSpeed = 50; // ms per char (from your TypewriterEffect)
      const startDelay = 100; // ms (from your TypewriterEffect)
      const msg = messages[messages.length - 1].content || '';
      setIsTypewriterActive(true);
      const timeout = setTimeout(() => {
        setIsTypewriterActive(false);
      }, startDelay + msg.length * typeSpeed);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  // Only run the timer-based scroll when isTypewriterActive and isNearBottom are true
  useEffect(() => {
    if (
      isTypewriterActive &&
      isNearBottom
    ) {
      const interval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isTypewriterActive, isNearBottom]);

  // Handle tooltip click
  const handleTooltipClick = async (tooltip: string) => {
    handleFirstInteraction();
    if (!user) return;
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      content: tooltip,
      user: 'me',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    // Always instruct the AI to answer ONLY in the selected language, not mention language, and keep it short
    const prompt = `${tooltip}\n\nPlease answer ONLY in ${languageNames[language] || 'English'}, regardless of the language of the question. Do not mention language or your ability to assist in other languages. Keep your answer short and concise.`;
    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || t('chat.greeting'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: t('common.error'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-auth-gradient min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-white/30">
        <header className="p-6 flex justify-between items-center relative border-b border-white/20">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white drop-shadow">{t('chat.assistantTitle') || 'Assistente IA'}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-white/80">{user.email}</span>
            <div className="relative">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none"
                aria-label={t('settings.title')}
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
                    {dark ? t('settings.lightMode') : t('settings.darkMode')}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#181830] rounded-b-xl"
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V9m7.5 0v10.5A2.25 2.25 0 0113.5 21h-3a2.25 2.25 0 01-2.25-2.25V9m7.5 0H18a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0118 21h-12a2.25 2.25 0 01-2.25-2.25v-7.5A2.25 2.25 0 016 9h1.5' />
                    </svg>
                    {t('auth.signOut') || 'Sair'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
          {greetingLoading ? (
            <div className="flex justify-center items-center py-8">
              <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></span>
              <span className="ml-3 text-white/80">{t('chat.greetingLoading')}</span>
            </div>
          ) : (
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
                    className={`rounded-xl px-5 py-3 pb-6 border-[0.5px] border-white text-white bg-transparent max-w-[70%] min-w-[100px] text-base relative ${msg.user === 'me' ? 'ml-2' : 'mr-2'}`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {msg.user === 'bot' ? (
                        <TypewriterEffect
                          text={msg.content}
                          cursorColor="transparent"
                          textColor="#ffffff"
                          startDelay={100}
                          typeSpeed={50}
                        />
                      ) : (
                        <span>{msg.content}</span>
                      )}
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
                          <button
                            className={`hover:text-blue-300 transition-colors`}
                            onClick={async () => {
                              setTtsLoadingMsgId(msg.id);
                              await playTTS(msg.content, () => setTtsLoadingMsgId(null));
                              setTtsLoadingMsgId(null);
                            }}
                            disabled={ttsLoadingMsgId === msg.id}
                          >
                            {ttsLoadingMsgId === msg.id ? (
                              <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 inline-block"></span>
                            ) : (
                              <FaVolumeUp className="text-lg text-white opacity-80" />
                            )}
                          </button>
                          <button className="hover:text-blue-300 transition-colors" onClick={() => setCommentModal({ open: true, message: { id: msg.id, content: msg.content } })}><FaRegCommentDots className="text-lg text-white opacity-80" /></button>
                        </>
                      )}
                      {((msg.user === 'bot' && !isTypewriterActive && msg.id === messages[messages.length-1]?.id) || msg.user === 'me') && (
                        <span className="absolute bottom-0 right-4 text-xs opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
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
          )}
        </main>
        {/* Tooltips above the input */}
        {showTooltips && tooltips.length > 0 && (
          <div className="w-full px-6">
            <div className="w-full border-t border-white/30 mb-4" />
            <div className="flex flex-col gap-2 mb-4 items-center w-full">
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                {tooltips.slice(0, 2).map((tip, idx) => (
                  <button
                    key={idx}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors"
                    onClick={() => handleTooltipClick(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                {tooltips.slice(2, 4).map((tip, idx) => (
                  <button
                    key={idx+2}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors"
                    onClick={() => handleTooltipClick(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
              placeholder={t('chat.typeMessage')}
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
            <button
              type="button"
              className="text-xl text-blue-600 dark:text-blue-200 hover:text-blue-400 ml-1"
              onClick={() => {
                // Find the last AI message
                const lastBotMsg = [...messages].reverse().find(m => m.user === 'bot');
                if (lastBotMsg) {
                  setVoiceModalMode('ai-speaking');
                  setVoiceModalOpen(true);
                  playTTS(lastBotMsg.content, () => {
                    setVoiceModalMode('ready-to-record');
                  });
                }
              }}
            >
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
      <VoiceModal
        open={voiceModalOpen}
        mode={voiceModalMode}
        onClose={handleVoiceModalClose}
        onToggleRecord={handleToggleRecord}
      />
    </div>
  );
};

export default Chat; 