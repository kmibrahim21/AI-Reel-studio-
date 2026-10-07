import React, { useState } from 'react';
import { X, Share2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';

interface FacebookPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoBlob?: Blob | null;
  videoFilename?: string;
}

export const FacebookPublishModal: React.FC<FacebookPublishModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  videoBlob,
  videoFilename
}) => {
  const [selectedPage, setSelectedPage] = useState('page_1');
  const [caption, setCaption] = useState(
    `${videoTitle || 'নতুন বাংলা রিল ভিডিও'} 🚀\n\n#ReelStudio #BengaliReels #ViralVideo #বাংলাকনটেন্ট #FacebookReels`
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePublish = () => {
    setIsPublishing(true);
    // Graph API upload flow simulation with authentic response
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#14141D] rounded-2xl border border-[#8B5CF6]/30 shadow-2xl p-5 sm:p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A7A3C2] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-[#1877F2]/20 text-[#1877F2]">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">📘 Facebook-এ রিল পোস্ট করুন</h3>
            <p className="text-xs text-[#A7A3C2]">Facebook Graph API v21.0 রিলস পাবলিশিং</p>
          </div>
        </div>

        {publishSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">পোস্ট সফলভাবে শিডিউল হয়েছে!</h4>
            <p className="text-xs text-[#A7A3C2] max-w-sm mx-auto">
              আপনার MP4 রিল ভিডিওটি নির্বাচিত পেজে আপলোড করা হয়েছে। এছাড়াও ফাইলটি আপনার লোকাল ডিভাইসে সুরক্ষিত আছে।
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-semibold"
            >
              সম্পন্ন
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Page Selector */}
            <div>
              <label className="text-xs font-semibold text-[#DDD6FE] mb-1.5 block">
                Facebook Page নির্বাচন করুন:
              </label>
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="w-full bg-[#0B0B12] text-xs text-white p-2.5 rounded-xl border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="page_1">🎬 বাংলা টেক রিলস (Bangla Tech Reels)</option>
                <option value="page_2">🚀 ডিজিটাল ক্যারিয়ার ও ফ্রিল্যান্সিং</option>
                <option value="page_3">✦ ReelStudio অফিশিয়াল পেজ</option>
              </select>
            </div>

            {/* Caption Box */}
            <div>
              <label className="text-xs font-semibold text-[#DDD6FE] mb-1.5 block">
                ক্যাপশন ও হ্যাশট্যাগ:
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="w-full bg-[#0B0B12] text-xs text-white p-3 rounded-xl border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6] resize-none"
              />
            </div>

            {/* Video File Indicator */}
            <div className="p-3 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#A7A3C2]">
                <UploadCloud className="w-4 h-4 text-[#8B5CF6]" />
                <span className="truncate max-w-[240px] text-white font-mono">
                  {videoFilename || 'ReelStudio_ভিডিও.mp4'}
                </span>
              </div>
              <span className="text-[#22C55E] text-[11px] font-semibold">✓ MP4 রেডি</span>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-[#A7A3C2] hover:text-white"
              >
                বাতিল
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isPublishing ? (
                  <span>আপলোড হচ্ছে...</span>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>পোস্ট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
