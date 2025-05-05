import React from 'react';
import { FaMicrophone, FaStop, FaTimes, FaVolumeUp, FaSpinner } from 'react-icons/fa';
import { useLanguage } from '../lib/LanguageContext';
import { useTranslation } from '../lib/i18n';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (audioBlob: Blob) => void;
  mode: 'ai-speaking' | 'ready-to-record' | 'recording' | 'thinking' | 'loading';
  onToggleRecord: () => void;
}

const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  onToggleRecord,
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 border border-white/20 rounded-2xl p-6 w-full max-w-md backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'ai-speaking' ? t('voice.aiSpeaking') :
             mode === 'thinking' ? t('voice.aiThinking') :
             mode === 'loading' ? t('voice.loading') :
             mode === 'recording' ? t('voice.title') :
             t('voice.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
              {mode === 'ai-speaking' ? (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <FaVolumeUp className="text-white text-2xl" />
                </div>
              ) : mode === 'thinking' ? (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <FaSpinner className="text-white text-2xl animate-spin" />
                </div>
              ) : mode === 'loading' ? (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <FaSpinner className="text-white text-2xl animate-spin" />
                </div>
              ) : mode === 'recording' ? (
                <div className="animate-pulse w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                  <FaStop className="text-white text-2xl" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <FaMicrophone className="text-white text-2xl" />
                </div>
              )}
            </div>
            {mode === 'recording' && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                {/* Removed extra label under stop icon */}
              </div>
            )}
          </div>

          {(mode === 'ready-to-record' || mode === 'recording') && (
            <button
              onClick={onToggleRecord}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
                mode === 'recording'
                  ? 'bg-red-500/80 hover:bg-red-500'
                  : 'bg-blue-500/80 hover:bg-blue-500'
              }`}
            >
              {mode === 'recording' ? t('voice.stop') : t('voice.start')}
            </button>
          )}

          {mode === 'ai-speaking' && (
            <div className="text-white/80 text-center">
              {t('voice.aiSpeaking')}
            </div>
          )}

          {mode === 'thinking' && (
            <div className="text-white/80 text-center">
              {t('voice.aiThinking')}
            </div>
          )}

          {mode === 'loading' && (
            <div className="text-white/80 text-center">
              {t('voice.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceModal; 