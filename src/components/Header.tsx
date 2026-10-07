import React from 'react';
import { AppTab } from '../types';
import { Film, FolderGit2, History, Settings, Save, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  projectTitle: string;
  onSaveProject: () => void;
  isSaving?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  projectTitle,
  onSaveProject,
  isSaving
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0B0B12]/90 backdrop-blur-md border-b border-[#8B5CF6]/20 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onTabChange('studio')}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                ✦ ReelStudio
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#DDD6FE] border border-[#8B5CF6]/30">v4</span>
              </span>
              <p className="text-[11px] text-[#A7A3C2] hidden sm:block">বাংলা স্ক্রিপ্ট টু প্রফেশনাল রিল ভিডিও</p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-[#14141D] p-1 rounded-xl border border-[#8B5CF6]/15 max-w-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'studio'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/25'
                : 'text-[#A7A3C2] hover:text-[#F4F2FF] hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">🎬 ভিডিও</span>
            <span className="hidden sm:inline"> বানাও</span>
          </button>

          <button
            onClick={() => onTabChange('projects')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'projects'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/25'
                : 'text-[#A7A3C2] hover:text-[#F4F2FF] hover:bg-white/5'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>📁 Projects</span>
          </button>

          <button
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/25'
                : 'text-[#A7A3C2] hover:text-[#F4F2FF] hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>🕘 History</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/25'
                : 'text-[#A7A3C2] hover:text-[#F4F2FF] hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>⚙️ Settings</span>
          </button>
        </nav>

        {/* Quick Save Action */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right max-w-[140px] truncate">
            <span className="text-[11px] text-[#A7A3C2] block">চলতি প্রকল্প</span>
            <span className="text-xs font-medium text-white truncate block">{projectTitle || 'শিরোনামহীন'}</span>
          </div>
          <button
            onClick={onSaveProject}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#14141D] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 text-white rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-[#DDD6FE]" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
