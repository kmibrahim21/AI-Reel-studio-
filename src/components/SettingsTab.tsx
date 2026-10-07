import React, { useState, useEffect } from 'react';
import { AppSettings, VoiceName, TemplateType, TTSEngine } from '../types';
import { Settings, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle, Key, Save, RefreshCw, Rocket, ExternalLink, Sparkles } from 'lucide-react';
import {
  getStoredGeminiKey,
  setStoredGeminiKey,
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
  const [geminiKey, setGeminiKey] = useState(() => getStoredGeminiKey() || settings.geminiApiKey || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiSaveNotice, setGeminiSaveNotice] = useState(false);

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

  // Initial health check on mount
  useEffect(() => {
    const key = (geminiKey || '').trim();
    if (key) {
      handleCheckGeminiHealth(key);
    } else {
      // Check if backend has environment key configured
      fetch('/api/health-check', { method: 'GET' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.hasServerKey) {
              setGeminiStatus({
                category: 'valid',
                label: '✓ সক্রিয় (সার্ভার কনফিগার্ড)',
                detail: 'সার্ভার এনভায়রনমেন্টে Gemini API Key সক্রিয় ও প্রস্তুত আছে।'
              });
            }
          }
        })
        .catch(() => {
          // Silent catch on initial mount if running without server
        });
    }
  }, []);

  // Check health of Gemini key
  const handleCheckGeminiHealth = async (keyToCheck?: string) => {
    const key = (keyToCheck !== undefined ? keyToCheck : geminiKey).trim();
    setIsCheckingGemini(true);
    setGeminiStatus(null);

    // If key is not entered by user, verify if server key is available
    if (!key) {
      try {
        const resp = await fetch('/api/health-check', { method: 'GET' });
        if (resp.ok) {
          const data = await resp.json().catch(() => null);
          if (data?.hasServerKey) {
            setGeminiStatus({
              category: 'valid',
              label: '✓ সক্রিয় (সার্ভার কনফিগার্ড)',
              detail: 'সার্ভার এনভায়রনমেন্টে Gemini API Key সক্রিয় ও প্রস্তুত আছে।'
            });
            setIsCheckingGemini(false);
            return;
          }
        }
      } catch {
        // Continue to prompt
      }

      setGeminiStatus({
        category: 'invalid',
        label: '🔑 কোনো কী দেওয়া হয়নি',
        detail: 'AI স্ক্রিপ্ট ও ভয়েস ব্যবহারের জন্য নিচে আপনার Gemini API Key দিয়ে Save করুন।'
      });
      setIsCheckingGemini(false);
      return;
    }

    // 1. Try server health-check proxy
    try {
      const resp = await fetch('/api/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': key
        },
        body: JSON.stringify({ customApiKey: key })
      });

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();

        if (resp.ok && data.ok) {
          setGeminiStatus({
            category: 'valid',
            label: '✓ সক্রিয় ও প্রস্তুত',
            detail: 'Gemini API Key সফলভাবে কাজ করছে!'
          });
          setIsCheckingGemini(false);
          return;
        } else if (data.statusCategory === 'quota_exceeded' || data.code === 429) {
          setGeminiStatus({
            category: 'quota',
            label: '⚠️ কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো',
            detail: 'Google AI Studio কোটার সীমা শেষ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।'
          });
          setIsCheckingGemini(false);
          return;
        } else if (data.banglaReason) {
          setGeminiStatus({
            category: 'invalid',
            label: data.banglaReason || '❌ অবৈধ key',
            detail: data.detailedHelp || 'Gemini API Key পরীক্ষা করুন।'
          });
          setIsCheckingGemini(false);
          return;
        }
      }
    } catch {
      // Server proxy fetch failed, fall through to direct Google API verification below
    }

    // 2. Direct Google Generative Language API verification (resilient fallback for static hosting / Vercel cold-starts)
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`;
      const directResp = await fetch(testUrl, { method: 'GET' });

      if (directResp.ok) {
        setGeminiStatus({
          category: 'valid',
          label: '✓ সক্রিয় ও প্রস্তুত',
          detail: 'Google Gemini API কী সফলভাবে সরাসরি যাচাই হয়েছে ও প্রস্তুত!'
        });
      } else if (directResp.status === 429) {
        setGeminiStatus({
          category: 'quota',
          label: '⚠️ কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো',
          detail: 'Google AI Studio কোটার সীমা শেষ হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।'
        });
      } else if (directResp.status === 400 || directResp.status === 403) {
        const errJson = await directResp.json().catch(() => null);
        setGeminiStatus({
          category: 'invalid',
          label: '❌ অবৈধ key',
          detail: errJson?.error?.message || 'Gemini API Key সঠিক নয়। অনুগ্রহ করে নতুন কী পরীক্ষা করুন।'
        });
      } else {
        setGeminiStatus({
          category: 'invalid',
          label: '❌ যাচাই ব্যর্থ',
          detail: `সার্ভার রেসপন্স কোড: ${directResp.status}। অনুগ্রহ করে কি সঠিক আছে কিনা দেখুন।`
        });
      }
    } catch {
      setGeminiStatus({
        category: 'error',
        label: '⚠️ ইন্টারনেট সংযোগ চেক করুন',
        detail: 'গুগল সার্ভারের সাথে সংযোগ করা যাচ্ছে না। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করুন।'
      });
    } finally {
      setIsCheckingGemini(false);
    }
  };

  // Save Gemini Key
  const handleSaveGeminiKey = () => {
    const trimmed = geminiKey.trim();
    setStoredGeminiKey(trimmed);
    onSaveSettings({
      ...settings,
      geminiApiKey: trimmed
    });
    setGeminiSaveNotice(true);
    setTimeout(() => setGeminiSaveNotice(false), 2500);
    handleCheckGeminiHealth(trimmed);
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
    const trimmedGemini = geminiKey.trim();
    const trimmedPat = githubPat.trim();
    const trimmedRepo = githubRepo.trim() || 'kmibrahim21/ReelStudio';
    setStoredGeminiKey(trimmedGemini);
    setStoredGitHubPat(trimmedPat);
    setStoredGitHubRepo(trimmedRepo);
    onSaveSettings({
      ...settings,
      geminiApiKey: trimmedGemini,
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
          Gemini API কী, ডিফল্ট ভয়েস এবং টেমপ্লেট কনফিগারেশন সংরক্ষণ করুন
        </p>
      </div>

      {/* 1. PRIMARY: Gemini API Key Configuration (TOP SECTION) */}
      <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[#1C1833] to-[#14141D] border-2 border-[#8B5CF6]/40 shadow-xl shadow-[#8B5CF6]/10 glow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/20 text-[#C084FC]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔑 Gemini API Key</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/25 text-[#DDD6FE] border border-[#8B5CF6]/30">
                  AI স্ক্রিপ্ট ও ভয়েস
                </span>
              </h3>
              <p className="text-xs text-[#A7A3C2]">
                Google AI Studio কী — AI স্ক্রিপ্ট তৈরি ও বাংলা ভয়েসওভার (TTS)-এর জন্য ব্যবহৃত হবে
              </p>
            </div>
          </div>

          {/* Quick status pill in header */}
          {geminiStatus && (
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border self-start sm:self-auto ${
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
        </div>

        {/* Input + Action Buttons */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setGeminiStatus(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveGeminiKey()}
                placeholder="AIzaSy... (Gemini API Key পেস্ট করুন)"
                className="w-full pl-4 pr-11 py-2.5 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/40 text-xs sm:text-sm text-white placeholder-[#A7A3C2]/40 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3.5 top-3 text-[#A7A3C2] hover:text-white"
                title={showGeminiKey ? 'কী লুকান' : 'কী দেখুন'}
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveGeminiKey}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Save (সংরক্ষণ)</span>
              </button>

              <button
                onClick={() => handleCheckGeminiHealth()}
                disabled={isCheckingGemini}
                className="px-4 py-2.5 rounded-xl bg-[#0B0B12] hover:bg-white/5 text-[#DDD6FE] border border-[#8B5CF6]/40 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGemini ? 'animate-spin' : ''}`} />
                <span>✓ Check</span>
              </button>
            </div>
          </div>

          {/* Detailed Status Notification */}
          {geminiStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border animate-in fade-in duration-200 ${
              geminiStatus.category === 'valid'
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                : geminiStatus.category === 'quota'
                ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            }`}>
              {geminiStatus.category === 'valid' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              {geminiStatus.category === 'quota' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              {geminiStatus.category === 'invalid' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div>
                <strong className="block text-sm font-bold mb-0.5">{geminiStatus.label}</strong>
                {geminiStatus.detail && (
                  <span className="opacity-90 block">{geminiStatus.detail}</span>
                )}
              </div>
            </div>
          )}

          {geminiSaveNotice && (
            <p className="text-xs text-[#22C55E] flex items-center gap-1 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Gemini API Key লোকাল স্টোরেজে সফলভাবে সংরক্ষিত হয়েছে!</span>
            </p>
          )}

          <p className="text-[11px] text-[#A7A3C2] leading-relaxed">
            কী পাওয়ার উপায়: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#DDD6FE] underline hover:text-white font-medium">aistudio.google.com/app/apikey</a> থেকে ফ্রি Gemini API Key তৈরি করে এখানে পেস্ট করতে পারেন (অথবা ব্যাকএন্ড এনভায়রনমেন্টে <code className="text-[#DDD6FE] font-mono">GEMINI_API_KEY</code> থাকলে এটি স্বয়ংক্রিয়ভাবে কাজ করবে)।
          </p>
        </div>
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
