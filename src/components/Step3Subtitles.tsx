import React, { useState, useEffect } from 'react';
import { SubtitleConfig, SubtitleAnimation, SubtitleFont, SubtitleSize, SubtitlePosition } from '../types';
import { Type, Sparkles, Eye, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step3SubtitlesProps {
  subtitles: SubtitleConfig;
  onSubtitlesChange: (cfg: SubtitleConfig) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step3Subtitles: React.FC<Step3SubtitlesProps> = ({
  subtitles,
  onSubtitlesChange,
  onNext,
  onPrev
}) => {
  // Live animated preview index for karaoke / word-by-word
  const [previewWordIndex, setPreviewWordIndex] = useState(0);
  const sampleWords = ['প্রতিটা', 'শব্দ', 'ভয়েসওভারের', 'সাথে', 'নিখুঁতভাবে', 'মিলবে'];

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewWordIndex((prev) => (prev + 1) % sampleWords.length);
    }, 700);
    return () => clearInterval(timer);
  }, [sampleWords.length]);

  const update = (partial: Partial<SubtitleConfig>) => {
    onSubtitlesChange({ ...subtitles, ...partial });
  };

  return (
    <div className="space-y-6">
      {/* 1. Subtitle Master Toggle */}
      <div className="p-4 sm:p-5 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#F4F2FF]">ভিডিওতে সাবটাইটেল বসাও</h3>
          <p className="text-xs text-[#A7A3C2]">
            narration থেকে তৈরি — প্রতিটা শব্দ voiceover-এর সাথে মিলবে এবং স্বয়ংক্রিয়ভাবে রেন্ডার হবে।
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={subtitles.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-[#0B0B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#8B5CF6] peer-checked:to-[#7C3AED] border border-[#8B5CF6]/30"></div>
        </label>
      </div>

      {subtitles.enabled && (
        <>
          {/* 2. Interactive Live Preview Box */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#8B5CF6]" />
                <h4 className="text-sm font-semibold text-white">লাইভ সাবটাইটেল প্রিভিউ</h4>
              </div>
              <span className="text-[11px] text-[#A7A3C2]">রিয়েল-টাইম টেস্ট অ্যানিমেশন</span>
            </div>

            <div className="h-32 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/25 flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8B5CF6]/5 to-transparent pointer-events-none" />
              
              {/* Render animated preview text according to config */}
              <div
                className="text-center px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-[#8B5CF6]/30 shadow-lg"
                style={{
                  fontFamily: `'${subtitles.font}', sans-serif`,
                  fontSize: subtitles.size === 'small' ? '15px' : subtitles.size === 'large' ? '22px' : '18px',
                  fontWeight: 700,
                }}
              >
                {subtitles.animation === 'classic' ? (
                  <span
                    style={{
                      color: subtitles.textColor,
                      textShadow: `-1px -1px 0 ${subtitles.outlineColor}, 1px -1px 0 ${subtitles.outlineColor}, -1px 1px 0 ${subtitles.outlineColor}, 1px 1px 0 ${subtitles.outlineColor}`
                    }}
                  >
                    {sampleWords.join(' ')}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {sampleWords.map((word, idx) => {
                      const isCurrent = idx === previewWordIndex;
                      const isPast = idx < previewWordIndex;
                      const isHighlighted = subtitles.animation === 'karaoke' ? (isPast || isCurrent) : isCurrent;

                      return (
                        <span
                          key={idx}
                          style={{
                            color: isHighlighted ? subtitles.highlightColor : subtitles.textColor,
                            transform: isCurrent ? 'scale(1.12)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                            textShadow: `-1px -1px 0 ${subtitles.outlineColor}, 1px -1px 0 ${subtitles.outlineColor}, -1px 1px 0 ${subtitles.outlineColor}, 1px 1px 0 ${subtitles.outlineColor}`
                          }}
                          className="inline-block"
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#A7A3C2] mt-2 text-center">
              অটো-শ্রিংক ও ওয়ার্ড-র‌্যাপ সক্রিয় — স্ক্রিনে সাবটাইটেল কোনোদিন ওভারফ্লো বা ক্লিপ হবে না।
            </p>
          </div>

          {/* 3. Animation Styles Cards */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
            <h4 className="text-sm font-semibold text-[#F4F2FF] mb-3">সাবটাইটেল অ্যানিমেশন স্টাইল</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'classic', title: 'Classic', desc: 'সাদা টেক্সট ও স্পষ্ট কালো আউটলাইন' },
                { id: 'word_by_word', title: 'Word-by-word pop', desc: 'প্রতিটা উচ্চারিত শব্দে মৃদু পপ ইফেক্ট' },
                { id: 'karaoke', title: 'Karaoke', desc: 'কথা চলার সাথে সাথে রঙের হাইলাইট' },
              ].map((style) => {
                const isSelected = subtitles.animation === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => update({ animation: style.id as SubtitleAnimation })}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-md'
                        : 'bg-[#0B0B12] border-[#8B5CF6]/20 text-[#A7A3C2] hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold text-white mb-1">{style.title}</span>
                    <span className="text-[11px] text-[#A7A3C2] leading-tight block">{style.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Font, Size, Position, Color Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Font */}
            <div className="p-4 rounded-xl bg-[#14141D] border border-[#8B5CF6]/20">
              <label className="text-xs font-semibold text-[#DDD6FE] mb-2 block">ফন্ট (Font)</label>
              <select
                value={subtitles.font}
                onChange={(e) => update({ font: e.target.value as SubtitleFont })}
                className="w-full bg-[#0B0B12] text-xs text-white p-2.5 rounded-lg border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="Hind Siliguri">Hind Siliguri (ডিফল্ট)</option>
                <option value="Noto Sans Bengali">Noto Sans Bengali</option>
              </select>
            </div>

            {/* Size */}
            <div className="p-4 rounded-xl bg-[#14141D] border border-[#8B5CF6]/20">
              <label className="text-xs font-semibold text-[#DDD6FE] mb-2 block">সাইজ (Size)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'small', label: 'ছোট' },
                  { id: 'medium', label: 'মাঝারি' },
                  { id: 'large', label: 'বড়' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ size: s.id as SubtitleSize })}
                    className={`py-2 text-xs rounded-lg border font-medium transition-all ${
                      subtitles.size === s.id
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#0B0B12] text-[#A7A3C2] border-[#8B5CF6]/20'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="p-4 rounded-xl bg-[#14141D] border border-[#8B5CF6]/20">
              <label className="text-xs font-semibold text-[#DDD6FE] mb-2 block">পজিশন (Position)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bottom', label: 'নিচে (Bottom)' },
                  { id: 'top', label: 'উপরে (Top)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => update({ position: p.id as SubtitlePosition })}
                    className={`py-2 text-xs rounded-lg border font-medium transition-all ${
                      subtitles.position === p.id
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#0B0B12] text-[#A7A3C2] border-[#8B5CF6]/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="p-4 rounded-xl bg-[#14141D] border border-[#8B5CF6]/20">
              <label className="text-xs font-semibold text-[#DDD6FE] mb-2 block">রং (Colors)</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={subtitles.textColor}
                    onChange={(e) => update({ textColor: e.target.value })}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                    title="টেক্সট রং"
                  />
                  <span className="text-[11px] text-[#A7A3C2]">টেক্সট</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={subtitles.highlightColor}
                    onChange={(e) => update({ highlightColor: e.target.value })}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                    title="হাইলাইট রং"
                  />
                  <span className="text-[11px] text-[#A7A3C2]">হাইলাইট</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 rounded-full bg-[#14141D] hover:bg-white/5 text-[#A7A3C2] hover:text-white border border-[#8B5CF6]/20 text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>আগের ধাপ: Format</span>
        </button>

        <button
          onClick={onNext}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#8B5CF6]/25 active:scale-95 flex items-center gap-2"
        >
          <span>পরবর্তী ধাপ: Motion</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
