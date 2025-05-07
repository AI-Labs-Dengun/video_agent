"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaRobot, FaUserCircle, FaRegThumbsUp, FaRegThumbsDown, FaRegCommentDots, FaVolumeUp, FaPaperPlane, FaRegSmile, FaMicrophone, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useSupabase } from '../providers/SupabaseProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useLanguage } from '../../lib/language';
import { useTranslation, Language } from '../../lib/i18n';
import TypewriterEffect from '../../components/TypewriterEffect';
import CommentModal from '../../components/CommentModal';
import VoiceModal from '../../components/VoiceModal';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';

const EmojiPicker = dynamic(() => import('@emoji-mart/react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-[350px] h-[400px] bg-white dark:bg-[#23234a] rounded-xl" />,
  onError: (error) => {
    console.error('Erro ao carregar EmojiPicker:', error);
  }
});

interface Message {
  id: string;
  content: string;
  user: 'me' | 'bot';
  created_at: string;
}

const languageNames: Record<string, string> = {
  'pt': 'Portuguese',
  'en': 'English',
  'es': 'Spanish'
};

const ChatComponent = () => {
  const { user, signOut } = useSupabase();
  const { dark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation(language as Language);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | undefined>>({});
  const [commentModal, setCommentModal] = useState<{ open: boolean, message?: { id: string, content: string } }>({ open: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEmojiButtonActive, setIsEmojiButtonActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceMode, setVoiceMode] = useState<'idle' | 'recording' | 'ai-speaking'>('idle');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [voiceModalMode, setVoiceModalMode] = useState<'ai-speaking' | 'ready-to-record' | 'recording' | 'thinking' | 'loading'>('ai-speaking');
  const [greetingLoading, setGreetingLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [ttsLoadingMsgId, setTtsLoadingMsgId] = useState<string | null>(null);
  const [tooltips, setTooltips] = useState<string[]>([]);
  const [showTooltips, setShowTooltips] = useState(true);
  const [showTooltipsModal, setShowTooltipsModal] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsModalRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(atBottom);
  };

  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  React.useEffect(() => {
    if (!user) {
      router.push('/sign-in');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setGreetingLoading(true);
      (async () => {
        try {
          const [instructionsRes, knowledgeRes] = await Promise.all([
            fetch('/AI_INSTRUCTIONS.md'),
            fetch('/AI_KNOWLEDGE.md'),
          ]);
          const instructionsText = await instructionsRes.text();
          const knowledgeText = await knowledgeRes.text();
          const greetingPrompt = `Generate a creative, warm, and original greeting for a new user in ${language}. Use the INSTRUCTIONS to define the tone and style of the message, and the KNOWLEDGE BASE to incorporate specific information about Dengun and its services. Be original and do not copy any examples from the instructions. The greeting should reflect Dengun's professional and welcoming personality, mentioning some of the main services and inviting the user to explore how we can help. Keep your answer very short (1-2 sentences).`;
          const res = await fetch('/api/chatgpt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: greetingPrompt }),
          });
          const data = await res.json();
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
  }, [language]);

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

  const handleFirstInteraction = () => {
    if (showTooltips) setShowTooltips(false);
  };

  const playTTS = async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') return;
    setVoiceModalMode('loading');
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
      setVoiceModalMode('ai-speaking');
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setVoiceModalMode('ready-to-record');
      if (onEnd) onEnd();
    }
  };

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
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, type, content }),
      });
    } catch (e) {}
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = 'pt-PT';
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang?.toLowerCase().startsWith('pt') &&
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('microsoft'))
      );
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
      await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment }),
      });
    } catch (e) {}
  };

  const handleEmojiButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !showEmojiPicker;
    setShowEmojiPicker(newState);
    setIsEmojiButtonActive(newState);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setIsEmojiButtonActive(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

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

  const handleToggleRecord = () => {
    console.log('handleToggleRecord called, current mode:', voiceModalMode);
    handleFirstInteraction();
    if (voiceModalMode === 'ready-to-record') {
      startRecording();
    } else if (voiceModalMode === 'recording') {
      stopRecording();
    }
  };

  const startRecording = async () => {
    console.log('startRecording called');
    if (typeof window === 'undefined') return;
    try {
      setVoiceModalMode('recording');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        handleAudioSubmit(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Recording error:', err);
      setVoiceModalMode('ready-to-record');
    }
  };

  const stopRecording = () => {
    console.log('stopRecording called');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setVoiceModalMode('thinking');
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceModalClose = () => {
    setVoiceModalOpen(false);
    setVoiceModalMode('ai-speaking');
    setVoiceMode('idle');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot') {
      const typeSpeed = 50;
      const startDelay = 100;
      const msg = messages[messages.length - 1].content || '';
      setIsTypewriterActive(true);
      const timeout = setTimeout(() => {
        setIsTypewriterActive(false);
      }, startDelay + msg.length * typeSpeed);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  useEffect(() => {
    if (isTypewriterActive && isNearBottom) {
      const interval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isTypewriterActive, isNearBottom]);

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

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setVoiceModalMode('thinking');
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsOpen && 
          settingsModalRef.current && 
          !settingsModalRef.current.contains(event.target as Node) &&
          settingsButtonRef.current && 
          !settingsButtonRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  if (!user) return null;

  return (
    <div className="bg-auth-gradient min-h-screen flex items-center justify-center">
      <div className="w-full h-screen md:h-[90vh] md:max-w-2xl flex flex-col rounded-none md:rounded-3xl shadow-2xl border border-white/30">
        <header className="p-4 md:p-4 flex justify-between items-center relative border-b border-white/20">
          <h1 className="text-2xl font-bold text-white drop-shadow">{t('chat.assistantTitle') || 'Assistente IA'}</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                ref={settingsButtonRef}
                onClick={() => setSettingsOpen((v) => !v)}
                className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none"
                aria-label={t('settings.title')}
              >
                <FaCog className="text-xl text-white" />
              </button>
              {settingsOpen && (
                <div 
                  ref={settingsModalRef}
                  className="absolute right-0 mt-2 w-48 bg-auth-gradient bg-opacity-90 rounded-xl shadow-lg border border-white z-50 backdrop-blur-md settings-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 rounded-t-xl"
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
                    className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 rounded-b-xl"
                  >
                    <FaSignOutAlt className="w-5 h-5 text-black dark:text-white" />
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
                      <FaRobot className="text-3xl text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-4 border-[0.5px] border-white text-white bg-transparent max-w-[90%] md:max-w-[90%] min-w-[100px] text-base relative ${msg.user === 'me' ? 'ml-2' : 'mr-2'}`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {msg.user === 'bot' ? (
                        <TypewriterEffect
                          text={msg.content}
                          speed={50}
                          delay={100}
                        />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-5 pb-1 relative justify-between">
                      <div className="flex items-center gap-2">
                        {msg.user === 'bot' && (
                          <>
                            <button
                              className={`transition-colors ${feedback[msg.id] === 'like' ? 'text-green-400' : 'text-white'} hover:text-green-400`}
                              onClick={() => handleFeedback(msg.id, 'like', msg.content)}
                            >
                              <FaRegThumbsUp className="text-lg" />
                            </button>
                            <button
                              className={`transition-colors ${feedback[msg.id] === 'dislike' ? 'text-red-400' : 'text-white'} hover:text-red-400`}
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
                                <FaVolumeUp className="text-lg text-white" />
                              )}
                            </button>
                            <button className="hover:text-blue-300 transition-colors" onClick={() => setCommentModal({ open: true, message: { id: msg.id, content: msg.content } })}><FaRegCommentDots className="text-lg text-white" /></button>
                          </>
                        )}
                      </div>
                      <span className="text-xs opacity-60 whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
        {showTooltips && tooltips.length > 0 && (
          <div className="w-full px-6">
            <div className="w-full border-t border-white/30 mb-2" />
            <div className="flex flex-col gap-2 mb-2 items-center w-full md:hidden">
              <button
                className="w-full flex-1 px-4 py-1.5 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors text-center text-sm"
                onClick={() => setShowTooltipsModal(true)}
              >
                Sugestões
              </button>
            </div>
            <div className="hidden md:flex flex-col gap-1.5 mb-2 items-center w-full">
              <div className="flex flex-col sm:flex-row gap-1.5 w-full justify-center">
                {tooltips.slice(0, 2).map((tip, idx) => (
                  <button
                    key={idx}
                    className="flex-1 px-4 py-1.5 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors text-sm"
                    onClick={() => handleTooltipClick(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 w-full justify-center ">
                {tooltips.slice(2, 4).map((tip, idx) => (
                  <button
                    key={idx+2}
                    className="flex-1 px-4 py-1.5 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors text-sm"
                    onClick={() => handleTooltipClick(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>
            {showTooltipsModal && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowTooltipsModal(false);
                  }
                }}
              >
                <div className="bg-auth-gradient bg-opacity-90 rounded-2xl shadow-2xl p-4 max-w-xs w-full flex flex-col items-center border border-white/30 backdrop-blur-md relative">
                  <button
                    className="absolute top-3 right-3 text-white/80 hover:text-white text-xl"
                    onClick={() => setShowTooltipsModal(false)}
                    aria-label="Close"
                    type="button"
                  >
                    &times;
                  </button>
                  <h2 className="text-base font-bold text-white mb-3 drop-shadow">Sugestões</h2>
                  <div className="flex flex-col gap-2 w-full">
                    {tooltips.slice(0, 4).map((tip, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-1.5 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors text-center text-sm"
                        onClick={() => { handleTooltipClick(tip); setShowTooltipsModal(false); }}
                      >
                        {tip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <footer className="w-full p-3">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 bg-transparent rounded-2xl px-4 py-2 shadow-md border border-white/30 relative"
          >
            <div className="flex items-center w-full">
              <button
                ref={emojiButtonRef}
                type="button"
                className={`hidden md:inline-flex text-xl text-white hover:text-gray-200 mr-2 ${isEmojiButtonActive ? 'text-blue-400' : ''}`}
                onClick={handleEmojiButtonClick}
                tabIndex={-1}
              >
                <FaRegSmile />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('chat.typeMessage')}
                className="flex-1 bg-transparent outline-none px-2 py-2 text-white dark:text-white placeholder-gray-200 dark:placeholder-gray-300"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={loading}
                style={{ background: 'transparent' }}
              />
              <button
                type="submit"
                className="text-xl text-white hover:text-gray-200 disabled:opacity-50 ml-2"
                disabled={!newMessage.trim() || loading}
              >
                <FaPaperPlane />
              </button>
              <button
                type="button"
                className="text-xl text-white hover:text-gray-200 ml-2"
                onClick={() => {
                  const lastBotMsg = [...messages].reverse().find(m => m.user === 'bot');
                  if (lastBotMsg) {
                    setVoiceModalMode('loading');
                    setVoiceModalOpen(true);
                    playTTS(lastBotMsg.content, () => {
                      setVoiceModalMode('ready-to-record');
                    });
                  }
                }}
              >
                <FaMicrophone />
              </button>
            </div>
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-12 left-0 z-50 emoji-picker-container"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-[#23234a] rounded-xl shadow-lg">
                  <EmojiPicker
                    data={data}
                    theme={dark ? 'dark' : 'light'}
                    onEmojiSelect={(e: any) => {
                      insertEmoji(e.native);
                    }}
                    previewPosition="none"
                    skinTonePosition="none"
                    searchPosition="none"
                  />
                </div>
              </div>
            )}
          </form>
        </footer>
      </div>
      <CommentModal
        isOpen={commentModal.open}
        onClose={() => setCommentModal({ open: false })}
        onSubmit={(comment) => {
          if (commentModal.message) {
            handleComment(commentModal.message.id, commentModal.message.content, comment);
          }
        }}
      />
      <VoiceModal
        isOpen={voiceModalOpen}
        onClose={handleVoiceModalClose}
        onSubmit={handleAudioSubmit}
        mode={voiceModalMode}
        onToggleRecord={handleToggleRecord}
      />
    </div>
  );
};

export default ChatComponent; 