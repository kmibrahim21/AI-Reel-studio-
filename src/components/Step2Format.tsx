import React from 'react';
import { AspectRatioType, ResolutionType, VisualType, TemplateType } from '../types';
import { Smartphone, Monitor, Square, Layers, Sparkles, Sun, Moon, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step2FormatProps {
  aspectRatio: AspectRatioType;
  onAspectRatioChange: (aspect: AspectRatioType) => void;
  resolution: ResolutionType;
  onResolutionChange: (res: ResolutionType) => void;
  visualType: VisualType;
  onVisualTypeChange: (vis: VisualType) => void;
  template: TemplateType;
  onTemplateChange: (tpl: TemplateType) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step2Format: React.FC<Step2FormatProps> = ({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  visualType,
  onVisualTypeChange,
  template,
  onTemplateChange,
  onNext,
  onPrev
}) => {
  const aspectCards: { id: AspectRatioType; title: string; subtitle: string; icon: React.ReactNode; dims: string }[] = [
    {
      id: '9:16',
      title: '9:16 Vertical',
      subtitle: 'রিল, টিকটক, ইউটিউব শর্টস',
      icon: <Smartphone className="w-5 h-5" />,
      dims: '1080 × 1920'
    },
    {
      id: '16:9',
      title: '16:9 Widescreen',
      subtitle: 'ইউটিউব ল্যান্ডস্কেপ ভিডিও',
      icon: <Monitor className="w-5 h-5" />,
      dims: '1920 × 1080'
    },
    {
      id: '1:1',
      title: '1:1 Square',
      subtitle: 'ইনস্টাগ্রাম ও ফেসবুক পোস্ট',
      icon: <Square className="w-5 h-5" />,
      dims: '1080 × 1080'
    },
    {
      id: '4:5',
      title: '4:5 Portrait',
      subtitle: 'ফেসবুক ও ইনস্টাগ্রাম ফিড',
      icon: <Layers className="w-5 h-5" />,
      dims: '1080 × 1350'
    }
  ];

  const resolutionOptions: { id: ResolutionType; label: string; badge?: string }[] = [
    { id: '720p', label: '720p HD' },
    { id: '1080p', label: '1080p Full HD', badge: 'প্রস্তাবিত' },
    { id: '1440p', label: '1440p 2K' },
    { id: '4K', label: '4K Ultra HD' },
  ];

  const visualOptions: { id: VisualType; title: string; desc: string; badge: string }[] = [
    { id: 'images', title: '🖼️ Images', desc: 'স্মুথ ও গতিশীল ইমেজ ফ্রেম', badge: 'দ্রুত' },
    { id: 'videos', title: '🎞️ Videos', desc: 'হাই-এনার্জি ভিডিও ভিজ্যুয়াল', badge: 'ধীর' },
    { id: 'mixed', title: '⚡ Mixed', desc: 'ইমেজ ও ভিডিও মিশ্র ফ্রেম', badge: 'ভারসাম্য' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Aspect Ratio Cards */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h3 className="text-base font-semibold text-[#F4F2FF] mb-1">ভিডিও অ্যাসপেক্ট রেশিও (Aspect Ratio)</h3>
        <p className="text-xs text-[#A7A3C2] mb-4">
          রেশিও পরিবর্তন করলে লাইভ ক্যানভাস এবং উপাদানের লেআউট সাথে সাথে সমন্বয় হবে।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {aspectCards.map((card) => {
            const isSelected = aspectRatio === card.id;
            return (
              <button
                key={card.id}
                onClick={() => onAspectRatioChange(card.id)}
                className={`p-4 rounded-[18px] text-left transition-all border relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#221B40] to-[#14141D] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/20'
                    : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40 hover:bg-[#151522]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${
                    isSelected ? 'bg-[#8B5CF6] text-white' : 'bg-[#14141D] text-[#A78BFA]'
                  }`}>
                    {card.icon}
                  </div>
                  <span className="text-[10px] text-[#A7A3C2] font-mono">{card.dims}</span>
                </div>
                <h4 className="text-sm font-bold text-[#F4F2FF] mb-0.5">{card.title}</h4>
                <p className="text-xs text-[#A7A3C2] leading-tight">{card.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Template Selector (2 cards) */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h3 className="text-base font-semibold text-[#F4F2FF] mb-1">ডিজাইন টেমপ্লেট (Visual Template)</h3>
        <p className="text-xs text-[#A7A3C2] mb-4">
          আপনার ভিডিওর ব্র্যান্ডিং অনুযায়ী ভিজ্যুয়াল থিম বেছে নিন।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Light Pro */}
          <button
            onClick={() => onTemplateChange('light_pro')}
            className={`p-4 sm:p-5 rounded-[18px] text-left transition-all border relative ${
              template === 'light_pro'
                ? 'bg-[#1E1B38] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/25'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-[#DDD6FE]">
                  <Sun className="w-5 h-5 text-amber-300" />
                </div>
                <h4 className="text-base font-bold text-white">🌟 Light Pro</h4>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#DDD6FE] border border-[#8B5CF6]/30">
                16:9 ও ক্লিন ফ্রেম
              </span>
            </div>
            <p className="text-xs text-[#A7A3C2] mb-3 leading-relaxed">
              হালকা ল্যাভেন্ডার ব্যাকগ্রাউন্ড, পার্পল অ্যাকসেন্ট ও আধুনিক স্ট্যাটাস বক্স। প্রফেশনাল এক্সপ্লেইনার ও করপোরেট কনটেন্টের জন্য আদর্শ।
            </p>
            <div className="p-2.5 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#1E1B4B] text-xs font-semibold flex items-center justify-between">
              <span>preview: stat_big · feature_list · chat_mock</span>
              <span className="text-[#8B5CF6]">Light</span>
            </div>
          </button>

          {/* Dark Neon */}
          <button
            onClick={() => onTemplateChange('dark_neon')}
            className={`p-4 sm:p-5 rounded-[18px] text-left transition-all border relative ${
              template === 'dark_neon'
                ? 'bg-[#1E1B38] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/25'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-[#DDD6FE]">
                  <Moon className="w-5 h-5 text-[#C084FC]" />
                </div>
                <h4 className="text-base font-bold text-white">🌃 Dark Neon</h4>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#DDD6FE] border border-[#8B5CF6]/30">
                9:16 রিল অপ্টিমাইজড
              </span>
            </div>
            <p className="text-xs text-[#A7A3C2] mb-3 leading-relaxed">
              গাঢ় ব্যাকগ্রাউন্ড, নিয়ন ভায়োলেট গ্লো এবং কাইনেটিক টাইপোগ্রাফি। শর্টস, টিকটক ও ফেসবুক রিলসে সর্বোচ্চ মনোযোগ আকর্ষণের জন্য সেরা।
            </p>
            <div className="p-2.5 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/40 text-[#DDD6FE] text-xs font-semibold flex items-center justify-between shadow-inner">
              <span>preview: neon_glow · kinetic_typography</span>
              <span className="text-[#A855F7]">Dark Neon</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Resolution & Scene Visuals Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resolution */}
        <div className="p-4 sm:p-5 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
          <h4 className="text-sm font-semibold text-[#F4F2FF] mb-2.5">রেন্ডার রেজোলিউশন (Resolution)</h4>
          <div className="grid grid-cols-2 gap-2">
            {resolutionOptions.map((res) => {
              const isSelected = resolution === res.id;
              return (
                <button
                  key={res.id}
                  onClick={() => onResolutionChange(res.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white font-semibold'
                      : 'bg-[#0B0B12] border-[#8B5CF6]/20 text-[#A7A3C2] hover:text-white'
                  }`}
                >
                  <span>{res.label}</span>
                  {res.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E]">
                      {res.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scene Visuals */}
        <div className="p-4 sm:p-5 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
          <h4 className="text-sm font-semibold text-[#F4F2FF] mb-2.5">ভিজ্যুয়াল স্টাইল (Scene Visuals)</h4>
          <div className="grid grid-cols-3 gap-2">
            {visualOptions.map((vis) => {
              const isSelected = visualType === vis.id;
              return (
                <button
                  key={vis.id}
                  onClick={() => onVisualTypeChange(vis.id)}
                  className={`p-2.5 rounded-xl text-center border transition-all text-xs ${
                    isSelected
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white font-semibold'
                      : 'bg-[#0B0B12] border-[#8B5CF6]/20 text-[#A7A3C2] hover:text-white'
                  }`}
                >
                  <span className="block font-medium mb-0.5">{vis.title}</span>
                  <span className="text-[10px] opacity-75">({vis.badge})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 rounded-full bg-[#14141D] hover:bg-white/5 text-[#A7A3C2] hover:text-white border border-[#8B5CF6]/20 text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>আগের ধাপ: Script</span>
        </button>

        <button
          onClick={onNext}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#8B5CF6]/25 active:scale-95 flex items-center gap-2"
        >
          <span>পরবর্তী ধাপ: Subtitles</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
