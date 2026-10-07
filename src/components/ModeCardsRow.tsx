import React from 'react';
import { AppMode } from '../types';
import { Film, Sparkles, Image, Video, Mic } from 'lucide-react';

interface ModeCardsRowProps {
  currentMode: AppMode;
  onModeSelect: (mode: AppMode) => void;
}

interface ModeDef {
  id: AppMode;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}

export const ModeCardsRow: React.FC<ModeCardsRowProps> = ({
  currentMode,
  onModeSelect
}) => {
  const modes: ModeDef[] = [
    {
      id: 'full_video',
      icon: <Film className="w-5 h-5 text-[#C084FC]" />,
      title: '🎬 Full Video',
      subtitle: 'স্ক্রিপ্ট → সম্পূর্ণ ভিডিও',
      badge: 'জনপ্রিয়'
    },
    {
      id: 'ai_script',
      icon: <Sparkles className="w-5 h-5 text-[#8B5CF6]" />,
      title: '✨ AI স্ক্রিপ্ট',
      subtitle: 'টপিক → অটো স্ক্রিপ্ট',
      badge: 'স্মার্ট'
    },
    {
      id: 'images_only',
      icon: <Image className="w-5 h-5 text-[#A78BFA]" />,
      title: '🖼️ Images Only',
      subtitle: 'ইমেজ ক্যানভাস রিল'
    },
    {
      id: 'videos_only',
      icon: <Video className="w-5 h-5 text-[#8B5CF6]" />,
      title: '🎞️ Videos Only',
      subtitle: 'ক্লিপ ভিজ্যুয়াল রিল'
    },
    {
      id: 'audio_only',
      icon: <Mic className="w-5 h-5 text-[#DDD6FE]" />,
      title: '🎙️ Audio Only',
      subtitle: 'টেক্সট → ভয়েসওভার',
      badge: 'দ্রুত'
    }
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeSelect(mode.id)}
              className={`relative text-left p-3.5 rounded-[18px] transition-all border group ${
                isActive
                  ? 'bg-gradient-to-b from-[#1E1838] to-[#14141D] border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/20 ring-1 ring-[#8B5CF6]'
                  : 'bg-[#14141D] border-[rgba(139,92,246,0.18)] hover:border-[#8B5CF6]/40 hover:bg-[#1A1A26]'
              }`}
            >
              {mode.badge && (
                <span className={`absolute top-2.5 right-2.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#8B5CF6]/15 text-[#DDD6FE] border border-[#8B5CF6]/30'
                }`}>
                  {mode.badge}
                </span>
              )}
              <div className="mb-2.5 flex items-center justify-start">
                <div className={`p-2 rounded-xl transition-colors ${
                  isActive ? 'bg-[#8B5CF6]/25' : 'bg-[#0B0B12] group-hover:bg-[#8B5CF6]/15'
                }`}>
                  {mode.icon}
                </div>
              </div>
              <h4 className="text-sm font-semibold text-[#F4F2FF] mb-0.5">{mode.title}</h4>
              <p className="text-[11px] text-[#A7A3C2] leading-tight">{mode.subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
