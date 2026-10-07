import React from 'react';
import { HistoryItem } from '../types';
import { History, Download, Film, Trash2, Calendar, Clock } from 'lucide-react';

interface HistoryTabProps {
  historyItems: HistoryItem[];
  onClearHistory: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  historyItems,
  onClearHistory
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#8B5CF6]" />
            <span>🕘 রেন্ডার ইতিহাস (Render History)</span>
          </h2>
          <p className="text-xs text-[#A7A3C2]">
            রেন্ডার করা সকল ভিডিওর লগ, সময়কাল, ফাইল সাইজ ও রি-ডাউনলোড লিংক
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3.5 py-1.5 rounded-xl bg-[#0B0B12] hover:bg-[#EF4444]/20 text-[#A7A3C2] hover:text-[#EF4444] border border-[#8B5CF6]/20 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ইতিহাস সাফ করুন</span>
          </button>
        )}
      </div>

      {historyItems.length === 0 ? (
        <div className="p-8 text-center rounded-[18px] bg-[#14141D] border border-[#8B5CF6]/20">
          <Film className="w-12 h-12 text-[#8B5CF6]/40 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-white mb-1">কোনো রেন্ডার ইতিহাস নেই</h4>
          <p className="text-xs text-[#A7A3C2] max-w-sm mx-auto">
            ভিডিও বানাও উইজার্ড থেকে যেকোনো স্ক্রিপ্ট রেন্ডার করলে তা এখানে সংরক্ষিত থাকবে।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleString('bn-BD', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={item.id}
                className="p-4 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)] hover:border-[#8B5CF6]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6]/20 to-[#7C3AED]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#DDD6FE]">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">{item.projectName}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-[#A7A3C2]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#8B5CF6]" />
                        <span>{Math.round(item.duration)} সেকেন্ড</span>
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[#DDD6FE]">{item.fileSizeMb} MB</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#DDD6FE] border border-[#8B5CF6]/30">
                    {item.aspectRatio}
                  </span>

                  {item.videoUrl && (
                    <a
                      href={item.videoUrl}
                      download={`ReelStudio_${item.projectName}.mp4`}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>রি-ডাউনলোড</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
