import React from 'react';
import { MotionConfig, CameraMotion, SceneTransition } from '../types';
import { Video, Film, Eye, Wand2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step4MotionProps {
  motion: MotionConfig;
  onMotionChange: (cfg: MotionConfig) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4Motion: React.FC<Step4MotionProps> = ({
  motion,
  onMotionChange,
  onNext,
  onPrev
}) => {
  const update = (partial: Partial<MotionConfig>) => {
    onMotionChange({ ...motion, ...partial });
  };

  const cameraOptions: { id: CameraMotion; title: string; desc: string; icon: string }[] = [
    { id: 'organic_breathe', title: 'Organic Breathe', desc: 'প্রাকৃতিক ও প্রাণবন্ত মৃদু জুম মোশন', icon: '🍃' },
    { id: 'slow_zoom', title: 'Slow Zoom In', desc: 'ধীরগতির সিনেমাটিক জুম ইন ইফেক্ট', icon: '🔍' },
    { id: 'pan_left_right', title: 'Pan Left→Right', desc: 'বাম থেকে ডানে অনুভূমিক প্যানিং', icon: '↔️' },
    { id: 'static', title: 'Static', desc: 'স্থির ও শান্ত ফ্রেম', icon: '⏹️' },
  ];

  const transitionOptions: { id: SceneTransition; title: string; desc: string; icon: string }[] = [
    { id: 'hard_cut', title: 'Cinematic Hard Cut', desc: 'তাত্ক্ষণিক ও স্পষ্ট সিনেমাটিক কাট', icon: '✂️' },
    { id: 'cross_dissolve', title: 'Cross Dissolve', desc: 'পরবর্তী দৃশ্যে কোমল ও মসৃণ রূপান্তর', icon: '🌫️' },
    { id: 'whip_pan', title: 'Whip Pan', desc: 'গতিশীল ডায়নামিক ট্রানজিশন', icon: '⚡' },
    { id: 'fade_violet', title: 'Fade Through Violet', desc: 'সিগনেচার ভায়োলেট গ্লো ফেড', icon: '💜' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Ken Burns Toggle */}
      <div className="p-4 sm:p-5 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#F4F2FF]">প্রতিটা image-এর উপর ক্যামেরা ঘোরাও (Ken Burns)</h3>
          <p className="text-xs text-[#A7A3C2]">
            সব motion <strong>easeOutExpo</strong> অ্যালগরিদমে চালিত — মসৃণ ও প্রিমিয়াম ভিজ্যুয়াল প্রবাহ, কোনো ঝাঁকুনি বা বাউন্স নেই।
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={motion.kenBurnsEnabled}
            onChange={(e) => update({ kenBurnsEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-[#0B0B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#8B5CF6] peer-checked:to-[#7C3AED] border border-[#8B5CF6]/30"></div>
        </label>
      </div>

      {/* 2. Camera Motion Selection */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h4 className="text-sm font-semibold text-[#F4F2FF] mb-1">ক্যামেরা মোশন স্টাইল (Camera Motion)</h4>
        <p className="text-xs text-[#A7A3C2] mb-4">প্রতিটি ফ্রেমের ভিজ্যুয়াল ক্যামেরার গতিশীল রূপ নির্বাচন করুন।</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cameraOptions.map((opt) => {
            const isSelected = motion.cameraMotion === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => update({ cameraMotion: opt.id })}
                className={`p-4 rounded-[18px] text-left transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#221B40] to-[#14141D] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-md shadow-[#8B5CF6]/20'
                    : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40 hover:bg-[#151522]'
                }`}
              >
                <div className="text-2xl mb-2">{opt.icon}</div>
                <h5 className="text-sm font-bold text-white mb-0.5">{opt.title}</h5>
                <p className="text-xs text-[#A7A3C2] leading-tight">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Scene Transition Selection */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h4 className="text-sm font-semibold text-[#F4F2FF] mb-1">দৃশ্য ট্রানজিশন (Scene Transition)</h4>
        <p className="text-xs text-[#A7A3C2] mb-4">এক দৃশ্য থেকে অন্য দৃশ্যে যাওয়ার সিনেমাটিক রূপান্তর স্টাইল।</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {transitionOptions.map((tr) => {
            const isSelected = motion.transition === tr.id;
            return (
              <button
                key={tr.id}
                onClick={() => update({ transition: tr.id })}
                className={`p-4 rounded-[18px] text-left transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#221B40] to-[#14141D] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-md shadow-[#8B5CF6]/20'
                    : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40 hover:bg-[#151522]'
                }`}
              >
                <div className="text-2xl mb-2">{tr.icon}</div>
                <h5 className="text-sm font-bold text-white mb-0.5">{tr.title}</h5>
                <p className="text-xs text-[#A7A3C2] leading-tight">{tr.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 rounded-full bg-[#14141D] hover:bg-white/5 text-[#A7A3C2] hover:text-white border border-[#8B5CF6]/20 text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>আগের ধাপ: Subtitles</span>
        </button>

        <button
          onClick={onNext}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#8B5CF6]/25 active:scale-95 flex items-center gap-2"
        >
          <span>পরবর্তী ধাপ: Voice</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
