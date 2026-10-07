import React, { useState, useEffect } from 'react';
import { AppSettings, VoiceName, TemplateType, TTSEngine } from '../types';
import { Settings, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle, Key, Save, RefreshCw, Rocket, ExternalLink, Sparkles } from 'lucide-react';
import {
  getStoredGitHubPat,
  setStoredGitHubPat,
  getStoredGitHubRepo,
  setStoredGitHubRepo
} from '../utils/storage';

interface SettingsTabProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSaveSettings
}) => {
  const [elevenLabsKey, setElevenLabsKey] = useState(settings.elevenLabsApiKey || '');
  const [defaultVoice, setDefaultVoice] = useState<VoiceName>(settings.defaultVoice || 'Kore');
  const [defaultTemplate, setDefaultTemplate] = useState<TemplateType>(settings.defaultTemplate || 'dark_neon');
  const [defaultEngine, setDefaultEngine] = useState<TTSEngine>(settings.defaultEngine || 'gemini');

  // GitHub Pro Render Configuration State
  const [githubPat, setGithubPat] = useState(() => getStoredGitHubPat() || settings.githubPat || '');
  const [githubRepo, setGithubRepo] = useState(() => getStoredGitHubRepo() || settings.githubRepo || 'kmibrahim21/ReelStudio');
  const [showGithubPat, setShowGithubPat] = useState(false);
  const [isTestingGithub, setIsTestingGithub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    category: 'valid' | 'invalid' | 'error';
    label: string;
    detail?: string;
  } | null>(null);
  const [githubSaveNotice, setGithubSaveNotice] = useState(false);

  const [showElevenKey, setShowElevenKey] = useState(false);

  // Health-check state
  const [isCheckingGemini, setIsCheckingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{
    category: 'valid' | 'invalid' | 'quota' | 'error';
    label: string;
    detail?: string;
  } | null>(null);

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Initial health check
  useEffect(() => {
    handleCheckGeminiHealth();
  }, []);

  // Check health of server Gemini key
  const handleCheckGeminiHealth = async () => {
    setIsCheckingGemini(true);
    setGeminiStatus(null);

    try {
      const resp = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        setGeminiStatus({
          category: 'valid',
          label: '✓ সক্রিয় ও প্রস্তুত',
          detail: 'Google AI Studio সার্ভার-সাইড Gemini API সফলভাবে সংযুক্ত রয়েছে।'
        });
      } else if (data.statusCategory === 'quota_exceeded' || data.code === 429) {
        setGeminiStatus({
          category: 'quota',
          label: '⚠️ কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো',
          detail: 'Google AI Studio কোটার সীমা শেষ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।'
        });
      } else {
        setGeminiStatus({
          category: 'invalid',
          label: data.banglaReason || '❌ সংযোগে সমস্যা',
          detail: data.detailedHelp || 'Gemini API সার্ভার এনভায়রনমেন্ট পরীক্ষা করুন।'
        });
      }
    } catch {
      setGeminiStatus({
        category: 'error',
        label: '⚠️ নেটওয়ার্ক সমস্যা — আবার চেষ্টা করো',
        detail: 'সার্ভার সংযোগে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      });
    } finally {
      setIsCheckingGemini(false);
    }
  };

  // Save GitHub Settings
  const handleSaveGithubSettings = () => {
    const trimmedPat = githubPat.trim();
    const trimmedRepo = githubRepo.trim() || 'kmibrahim21/ReelStudio';
    setStoredGitHubPat(trimmedPat);
    setStoredGitHubRepo(trimmedRepo);
    onSaveSettings({
      ...settings,
      githubPat: trimmedPat,
      githubRepo: trimmedRepo,
    });
    setGithubSaveNotice(true);
    setTimeout(() => setGithubSaveNotice(false), 2500);
  };

  // Test GitHub Connection
  const handleTestGitHubConnection = async () => {
    const pat = githubPat.trim();
    const repo = githubRepo.trim() || 'kmibrahim21/ReelStudio';

    if (!pat) {
      setGithubStatus({
        category: 'invalid',
        label: '❌ ব্যর্থ',
        detail: 'অনুগ্রহ করে আগে আপনার GitHub Personal Access Token (PAT) ইনপুট করুন।'
      });
      return;
    }

    setIsTestingGithub(true);
    setGithubStatus(null);

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (res.ok) {
        const repoData = await res.json();
        setGithubStatus({
          category: 'valid',
          label: '✓ Connected',
          detail: `রেপো সফলভাবে সংযুক্ত হয়েছে: ${repoData.full_name || repo}`
        });
      } else if (res.status === 401 || res.status === 403) {
        setGithubStatus({
          category: 'invalid',
          label: '❌ ব্যর্থ',
          detail: 'PAT অবৈধ অথবা এই রেপো অ্যাক্সেসের অনুমতি (repo scope) নেই।'
        });
      } else if (res.status === 404) {
        setGithubStatus({
          category: 'invalid',
          label: '❌ ব্যর্থ',
          detail: `রেপো '${repo}' খুঁজে পাওয়া যায়নি। রেপো নাম ও পারমিশন পরীক্ষা করুন।`
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setGithubStatus({
          category: 'invalid',
          label: '❌ ব্যর্থ',
          detail: data.message || `সার্ভার এরর কোড: ${res.status}`
        });
      }
    } catch (err: any) {
      setGithubStatus({
        category: 'error',
        label: '❌ ব্যর্থ',
        detail: 'ইন্টারনেট বা নেটওয়ার্ক সংযোগে সমস্যা দেখা দিয়েছে।'
      });
    } finally {
      setIsTestingGithub(false);
    }
  };

  // Save all settings
  const handleSaveAll = () => {
    const trimmedPat = githubPat.trim();
    const trimmedRepo = githubRepo.trim() || 'kmibrahim21/ReelStudio';
    setStoredGitHubPat(trimmedPat);
    setStoredGitHubRepo(trimmedRepo);
    onSaveSettings({
      ...settings,
      elevenLabsApiKey: elevenLabsKey.trim(),
      defaultVoice,
      defaultTemplate,
      defaultEngine,
      githubPat: trimmedPat,
      githubRepo: trimmedRepo,
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#8B5CF6]" />
          <span>⚙️ অ্যাপ্লিকেশন সেটিংস (Settings)</span>
        </h2>
        <p className="text-xs text-[#A7A3C2]">
          ডিফল্ট ভয়েস, টেমপ্লেট এবং ক্লাউড রেন্ডারিং কনফিগারেশন পরিচালনা করুন
        </p>
      </div>

      {/* 1. PRIMARY: Gemini AI Status (Google AI Studio Cloud) */}
      <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[#1C1833] to-[#14141D] border-2 border-[#8B5CF6]/40 shadow-xl shadow-[#8B5CF6]/10 glow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#8B5CF6]/20 text-[#C084FC]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✦ Gemini AI (Google AI Studio)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/25 text-[#DDD6FE] border border-[#8B5CF6]/30">
                  সার্ভার ইন্টিগ্রেশন
                </span>
              </h3>
              <p className="text-xs text-[#A7A3C2]">
                Gemini 3.8 Flash ও Gemini 3.8 TTS — এআই স্ক্রিপ্ট ও বাংলা ভয়েসওভার চালিত
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {geminiStatus && (
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                geminiStatus.category === 'valid'
                  ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                  : geminiStatus.category === 'quota'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                  : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
              }`}>
                {geminiStatus.category === 'valid' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {geminiStatus.category === 'quota' && <AlertTriangle className="w-3.5 h-3.5" />}
                {geminiStatus.category === 'invalid' && <XCircle className="w-3.5 h-3.5" />}
                <span>{geminiStatus.label}</span>
              </div>
            )}
            <button
              onClick={() => handleCheckGeminiHealth()}
              disabled={isCheckingGemini}
              className="px-3.5 py-1.5 rounded-xl bg-[#0B0B12] hover:bg-white/5 text-[#DDD6FE] border border-[#8B5CF6]/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGemini ? 'animate-spin' : ''}`} />
              <span>পুনরায় যাচাই</span>
            </button>
          </div>
        </div>

        {geminiStatus && geminiStatus.detail && (
          <div className="mt-2 text-xs text-[#A7A3C2] bg-[#0B0B12] p-3 rounded-xl border border-[#8B5CF6]/20">
            {geminiStatus.detail}
          </div>
        )}
      </div>

      {/* 2. PRO RENDER CLOUD: GitHub Actions Integration */}
      <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[#1C1733] to-[#14141D] border-2 border-[#8B5CF6]/40 shadow-xl shadow-[#8B5CF6]/10 glow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/20 text-[#C084FC]">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🚀 Pro Render (Cloud)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/25 text-[#DDD6FE] border border-[#8B5CF6]/30">
                  GitHub Actions
                </span>
              </h3>
              <p className="text-xs text-[#A7A3C2]">
                ক্লাউডে Playwright ও FFmpeg চালিত হাই-কোয়ালিটি ভিডিও রেন্ডারিং
              </p>
            </div>
          </div>

          {/* Status pill in header */}
          {githubStatus && (
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border self-start sm:self-auto ${
              githubStatus.category === 'valid'
                ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
            }`}>
              {githubStatus.category === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{githubStatus.label}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* GitHub PAT Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#DDD6FE]">
                GitHub Personal Access Token (PAT):
              </label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#A78BFA] hover:text-[#C084FC] flex items-center gap-1 underline"
              >
                <span>github.com/settings/tokens (scope: repo)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showGithubPat ? 'text' : 'password'}
                value={githubPat}
                onChange={(e) => {
                  setGithubPat(e.target.value);
                  setGithubStatus(null);
                }}
                placeholder="ghp_... অথবা github_pat_... (Personal Access Token)"
                className="w-full pl-4 pr-11 py-2.5 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/40 text-xs sm:text-sm text-white placeholder-[#A7A3C2]/40 focus:outline-none focus:border-[#8B5CF6] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGithubPat(!showGithubPat)}
                className="absolute right-3.5 top-3 text-[#A7A3C2] hover:text-white"
                title={showGithubPat ? 'টোকেন লুকান' : 'টোকেন দেখুন'}
              >
                {showGithubPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* GitHub Repo Input + Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-semibold text-[#DDD6FE] block mb-1.5">
                GitHub Repository (owner/repo):
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => {
                  setGithubRepo(e.target.value);
                  setGithubStatus(null);
                }}
                placeholder="kmibrahim21/ReelStudio"
                className="w-full px-4 py-2.5 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/40 text-xs sm:text-sm text-white placeholder-[#A7A3C2]/40 focus:outline-none focus:border-[#8B5CF6] font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleSaveGithubSettings}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>

              <button
                onClick={handleTestGitHubConnection}
                disabled={isTestingGithub}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#0B0B12] hover:bg-white/5 text-[#DDD6FE] border border-[#8B5CF6]/40 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingGithub ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {githubStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border animate-in fade-in duration-200 ${
              githubStatus.category === 'valid'
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            }`}>
              {githubStatus.category === 'valid' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div>
                <strong className="block text-sm font-bold mb-0.5">{githubStatus.label}</strong>
                {githubStatus.detail && (
                  <span className="opacity-90 block">{githubStatus.detail}</span>
                )}
              </div>
            </div>
          )}

          {githubSaveNotice && (
            <p className="text-xs text-[#22C55E] flex items-center gap-1 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>GitHub কনফিগারেশন লোকাল স্টোরেজে সফলভাবে সংরক্ষিত হয়েছে!</span>
            </p>
          )}

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20 text-[11px] text-[#A7A3C2] flex items-start gap-2">
            <span className="text-base shrink-0 leading-none">🔒</span>
            <p className="leading-relaxed">
              <strong className="text-[#DDD6FE]">PAT কখনো repo-তে যাবে না, শুধু তোমার browser-এ থাকবে</strong> (সংরক্ষিত: <code className="text-[#DDD6FE] font-mono">localStorage['reelstudio_github_pat']</code> ও <code className="text-[#DDD6FE] font-mono">['reelstudio_github_repo']</code>)।
            </p>
          </div>
        </div>
      </div>

      {/* 3. ElevenLabs API Key Configuration */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="text-sm font-bold text-white">ElevenLabs API Key (ঐচ্ছিক)</h3>
        </div>
        <p className="text-xs text-[#A7A3C2] mb-3">
          ElevenLabs মাল্টিলিঙ্গুয়াল টেক্সট-টু-স্পিচ ইঞ্জিন ব্যবহারের জন্য আপনার ব্যক্তিগত API Key দিন।
        </p>

        <div className="relative">
          <input
            type={showElevenKey ? 'text' : 'password'}
            value={elevenLabsKey}
            onChange={(e) => setElevenLabsKey(e.target.value)}
            placeholder="xi-api-key... (ঐচ্ছিক)"
            className="w-full pl-4 pr-10 py-2.5 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/30 text-xs sm:text-sm text-white placeholder-[#A7A3C2]/40 focus:outline-none focus:border-[#8B5CF6] font-mono"
          />
          <button
            type="button"
            onClick={() => setShowElevenKey(!showElevenKey)}
            className="absolute right-3 top-2.5 text-[#A7A3C2] hover:text-white"
          >
            {showElevenKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Default Preferences */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h3 className="text-sm font-bold text-white mb-3">ডিফল্ট সেটিংস ও পছন্দসমূহ</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[#DDD6FE] block mb-1.5 font-medium">ডিফল্ট ভয়েস:</label>
            <select
              value={defaultVoice}
              onChange={(e) => setDefaultVoice(e.target.value as VoiceName)}
              className="w-full bg-[#0B0B12] text-xs text-white p-2.5 rounded-xl border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="Kore">👩‍💼 Kore (নারী - ডিফল্ট)</option>
              <option value="Aoede">👩‍💼 Aoede (নারী - উষ্ণ)</option>
              <option value="Charon">👨‍💼 Charon (পুরুষ - গম্ভীর)</option>
              <option value="Fenrir">⚡ Fenrir (পুরুষ - উদ্যমী)</option>
              <option value="Puck">🎭 Puck (প্রাণবন্ত)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[#DDD6FE] block mb-1.5 font-medium">ডিফল্ট টেমপ্লেট:</label>
            <select
              value={defaultTemplate}
              onChange={(e) => setDefaultTemplate(e.target.value as TemplateType)}
              className="w-full bg-[#0B0B12] text-xs text-white p-2.5 rounded-xl border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="dark_neon">🌃 Dark Neon (9:16 রিল অপ্টিমাইজড)</option>
              <option value="light_pro">🌟 Light Pro (16:9 কর্পোরেট)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[#DDD6FE] block mb-1.5 font-medium">ডিফল্ট অডিও ইঞ্জিন:</label>
            <select
              value={defaultEngine}
              onChange={(e) => setDefaultEngine(e.target.value as TTSEngine)}
              className="w-full bg-[#0B0B12] text-xs text-white p-2.5 rounded-xl border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="gemini">🎙️ Gemini TTS</option>
              <option value="elevenlabs">✨ ElevenLabs</option>
              <option value="browser">🌐 Browser Voice (FREE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save All Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSaveAll}
          className="px-6 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>সকল সেটিংস সংরক্ষণ করুন</span>
        </button>

        {isSavedNotice && (
          <span className="text-xs font-semibold text-[#22C55E] flex items-center gap-1 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>সফলভাবে সংরক্ষিত হয়েছে!</span>
          </span>
        )}
      </div>
    </div>
  );
};
