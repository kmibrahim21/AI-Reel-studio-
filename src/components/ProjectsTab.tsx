import React from 'react';
import { ProjectData } from '../types';
import { FolderGit2, Plus, Copy, Trash2, ArrowUpRight, Calendar, Layers } from 'lucide-react';

interface ProjectsTabProps {
  projects: ProjectData[];
  currentProjectId: string;
  onOpenProject: (proj: ProjectData) => void;
  onDuplicateProject: (proj: ProjectData) => void;
  onDeleteProject: (projId: string) => void;
  onCreateNewProject: () => void;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  currentProjectId,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onCreateNewProject
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#8B5CF6]" />
            <span>📁 আপনার প্রকল্পসমূহ (Projects)</span>
          </h2>
          <p className="text-xs text-[#A7A3C2]">
            সংরক্ষিত সকল স্ক্রিপ্ট ও রিল ভিডিও কনফিগারেশন
          </p>
        </div>

        <button
          onClick={onCreateNewProject}
          className="px-4 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন প্রজেক্ট তৈরি করুন</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="p-8 text-center rounded-[18px] bg-[#14141D] border border-[#8B5CF6]/20">
          <FolderGit2 className="w-12 h-12 text-[#8B5CF6]/40 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-white mb-1">কোনো প্রকল্প পাওয়া যায়নি</h4>
          <p className="text-xs text-[#A7A3C2] max-w-sm mx-auto mb-4">
            নতুন একটি রিল স্ক্রিপ্ট শুরু করতে "নতুন প্রজেক্ট তৈরি করুন" বাটনে ক্লিক করুন।
          </p>
          <button
            onClick={onCreateNewProject}
            className="px-4 py-2 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-[#DDD6FE] border border-[#8B5CF6]/40 rounded-xl text-xs font-semibold"
          >
            নতুন প্রজেক্ট শুরু করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const isCurrent = proj.id === currentProjectId;
            const sceneCount = proj.scenes?.length || 0;
            const updatedDate = new Date(proj.updatedAt || Date.now()).toLocaleDateString('bn-BD', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={proj.id}
                className={`p-4 sm:p-5 rounded-[18px] bg-[#14141D] border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/15'
                    : 'border-[rgba(139,92,246,0.18)] hover:border-[#8B5CF6]/40'
                }`}
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#DDD6FE] border border-[#8B5CF6]/30">
                      {proj.aspectRatio || '9:16'}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-semibold">
                        চলতি প্রজেক্ট
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 truncate" title={proj.title}>
                    {proj.title || 'শিরোনামহীন রিল'}
                  </h3>

                  <p className="text-xs text-[#A7A3C2] line-clamp-2 mb-3">
                    {proj.scenes?.[0]?.headline || proj.rawScript.slice(0, 70) || 'কোনো বিবরণ নেই'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#A7A3C2] pt-3 border-t border-[#8B5CF6]/15 mb-3">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>{sceneCount}টি দৃশ্য</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{updatedDate}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenProject(proj)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    >
                      <span>খুলুন</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDuplicateProject(proj)}
                      className="p-2 rounded-xl bg-[#0B0B12] hover:bg-white/5 text-[#A7A3C2] hover:text-white border border-[#8B5CF6]/25 transition-colors"
                      title="প্রজেক্ট কপি করুন"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-2 rounded-xl bg-[#0B0B12] hover:bg-[#EF4444]/20 text-[#A7A3C2] hover:text-[#EF4444] border border-[#8B5CF6]/25 transition-colors"
                      title="প্রজেক্ট মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
