import React, { useState, useRef, useEffect } from 'react';
import { Scene, ComponentVisualType } from '../types';
import { parseScriptToScenes, validateScriptCoverage } from '../utils/scriptParser';
import { getStoredGeminiKey } from '../utils/storage';
import { InlineGeminiKeyBox } from './InlineGeminiKeyBox';
import { Sparkles, FileText, Upload, AlertTriangle, CheckCircle2, Plus, Trash2, ArrowRight } from 'lucide-react';

interface Step1ScriptProps {
  rawScript: string;
  onScriptChange: (newScript: string) => void;
  scenes: Scene[];
  onScenesChange: (newScenes: Scene[]) => void;
  projectTitle: string;
  onTitleChange: (newTitle: string) => void;
  onNext: () => void;
  customApiKey?: string;
  onApiKeyUpdate?: (key: string) => void;
}

export const Step1Script: React.FC<Step1ScriptProps> = ({
  rawScript,
  onScriptChange,
  scenes,
  onScenesChange,
  projectTitle,
  onTitleChange,
  onNext,
  customApiKey = '',
  onApiKeyUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiErrorWarning, setAiErrorWarning] = useState<string | null>(null);
  const [showKeyInputExplicit, setShowKeyInputExplicit] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate coverage whenever rawScript or scenes change
  const coverage = validateScriptCoverage(rawScript, scenes);

  // Auto-plan scenes from raw script
  const handleAutoPlanScenes = (scriptToParse: string) => {
    const parsed = parseScriptToScenes(scriptToParse);
    if (parsed.title && (!projectTitle || projectTitle === 'আমার বাংলা ভিডিও')) {
      onTitleChange(parsed.title);
    }
    onScenesChange(parsed.scenes);
  };

  // AI Script Generation
  const handleGenerateAiScript = async () => {
    if (!aiTopic.trim()) {
      setAiErrorWarning('অনুগ্রহ করে স্ক্রিপ্ট তৈরির জন্য একটি বিষয় (টপিক) লিখুন।');
      return;
    }

    setIsGeneratingAi(true);
    setAiErrorWarning(null);

    const activeKey = (customApiKey || getStoredGeminiKey() || '').trim();

    // 1. Try server proxy endpoint
    try {
      const resp = await fetch('/api/gemini/script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeKey ? { 'x-gemini-key': activeKey } : {})
        },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          customApiKey: activeKey
        })
      });

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();

        if (resp.ok && data.ok && data.script) {
          onScriptChange(data.script);
          handleAutoPlanScenes(data.script);
          setAiTopic('');
          setAiErrorWarning(null);
          setIsGeneratingAi(false);
          return;
        } else if (data.banglaReason || data.error) {
          setAiErrorWarning(data.banglaReason || data.error);
          setIsGeneratingAi(false);
          return;
        }
      }
    } catch {
      // Backend fetch failed, continue to direct client fallback
    }

    // 2. Direct Google Gemini API fallback (resilient for static host / Vercel proxy issues)
    if (activeKey) {
      try {
        const promptText = `টপিক: ${aiTopic.trim()}\n\nএই বিষয়ের উপর একটি ৪ থেকে ৬ দৃশ্যের আকর্ষণীয় বাংলা রিল স্ক্রিপ্ট তৈরি করো ZBot ফরম্যাটে।`;
        const sysInstruction = `You are ReelStudio, an elite Bengali video script creator for viral social media reels.
Structure format MUST follow EXACTLY this syntax:
TITLE: <আকর্ষণীয় বাংলা শিরোনাম>

## SCENE 1
NARRATION: <প্রথম দৃশ্যের ভয়েসওভার বাক্য>
IMAGE: <ভিজ্যুয়াল বর্ণনা>

## SCENE 2
NARRATION: <দ্বিতীয় দৃশ্যের ভয়েসওভার বাক্য>
IMAGE: <ভিজ্যুয়াল বর্ণনা>

## SCENE 3
NARRATION: <পরবর্তী দৃশ্যের ভয়েসওভার বাক্য>
IMAGE: <ভিজ্যুয়াল বর্ণনা>
(Generate 4 to 6 concise scenes in natural Bengali).`;

        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(activeKey)}`;
        const directResp = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            systemInstruction: { parts: [{ text: sysInstruction }] },
            generationConfig: { temperature: 0.7 }
          })
        });

        if (directResp.ok) {
          const directData = await directResp.json();
          const generated = directData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated) {
            onScriptChange(generated);
            handleAutoPlanScenes(generated);
            setAiTopic('');
            setAiErrorWarning(null);
            setIsGeneratingAi(false);
            return;
          }
        }
      } catch (directErr) {
        console.warn('Direct gemini script fallback error', directErr);
      }
    }

    setAiErrorWarning('⚠️ স্ক্রিপ্ট তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে সেটিংসে আপনার Gemini API Key চেক বা সেভ করুন।');
    setIsGeneratingAi(false);
  };

  // Handle file upload (.txt or .md)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onScriptChange(content);
        handleAutoPlanScenes(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  // Update scene item
  const updateScene = (idx: number, updates: Partial<Scene>) => {
    const updated = [...scenes];
    updated[idx] = { ...updated[idx], ...updates };
    onScenesChange(updated);
  };

  // Delete scene
  const deleteScene = (idx: number) => {
    if (scenes.length <= 1) return;
    const updated = scenes.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      sceneNumber: i + 1
    }));
    onScenesChange(updated);
  };

  // Add new scene
  const addNewScene = () => {
    const newNum = scenes.length + 1;
    const newScene: Scene = {
      id: `scene_${Date.now()}_${newNum}`,
      sceneNumber: newNum,
      headline: `দৃশ্য ${newNum}`,
      caption: 'নতুন দৃশ্যের ক্যাপশন লিখুন',
      voiceover_text: 'নতুন দৃশ্যের ভয়েসওভার টেক্সট লিখুন।',
      visualDescription: 'নতুন ভিজ্যুয়াল ফ্রেম',
      component: 'visual_card',
      voiceStatus: 'pending',
    };
    onScenesChange([...scenes, newScene]);
  };

  return (
    <div className="space-y-6">
      {/* Inline Gemini Key Box (always available or amber if key not provided) */}
      <InlineGeminiKeyBox
        currentKey={customApiKey}
        onKeySaved={(newKey) => {
          if (onApiKeyUpdate) onApiKeyUpdate(newKey);
          setAiErrorWarning(null);
        }}
        autoFocus={showKeyInputExplicit}
      />

      {/* 1. Honest AI Script Generator Box */}
      <div className="p-4 sm:p-5 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)] glow-card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
          <h3 className="text-base font-semibold text-[#F4F2FF]">✨ AI স্ক্রিপ্ট জেনারেটর (Gemini)</h3>
        </div>
        <p className="text-xs text-[#A7A3C2] mb-3">
          আপনার ভিডিওর টপিক বা ধারণা লিখুন। কোনো বানোয়াট তথ্য বা কৃত্রিম পরিসংখ্যান ছাড়া সৎ ও কার্যকরী বাংলা স্ক্রিপ্ট তৈরি হবে।
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAiScript()}
            placeholder="যেমন: ফ্রিল্যান্সিংয়ে কীভাবে দ্রুত প্রথম কাজ পাবেন..."
            className="flex-1 px-4 py-2.5 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/30 text-sm text-white placeholder-[#A7A3C2]/60 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
          />
          <button
            onClick={handleGenerateAiScript}
            disabled={isGeneratingAi}
            className="px-5 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#8B5CF6]/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingAi ? 'স্ক্রিপ্ট তৈরি হচ্ছে...' : 'স্ক্রিপ্ট লিখো'}</span>
          </button>
        </div>

        {/* Warning Banner on Generation Error */}
        {aiErrorWarning && (
          <div className="mt-3 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-start gap-2.5 text-[#F59E0B] animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold block">{aiErrorWarning}</span>
              <span className="text-[#F59E0B]/80 block mt-0.5">
                টপিক পরিবর্তন করে আবার চেষ্টা করতে পারেন অথবা সরাসরি নিচে নিজের স্ক্রিপ্ট পেস্ট করুন।
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Script Editor Tabs & Textarea */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#F4F2FF]">ভিডিও স্ক্রিপ্ট এডিটর (ZBot ফরম্যাট)</h3>
            <p className="text-xs text-[#A7A3C2]">টাইটেল, দৃশ্য সংখ্যা, ভয়েসওভার ও ভিজ্যুয়াল বর্ণনা লিখুন</p>
          </div>

          <div className="flex items-center gap-1 bg-[#0B0B12] p-1 rounded-xl border border-[#8B5CF6]/20">
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'paste'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-sm'
                  : 'text-[#A7A3C2] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>✏️ Paste Text</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-sm'
                  : 'text-[#A7A3C2] hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>📄 Upload File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md"
              className="hidden"
            />
          </div>
        </div>

        {/* Video Title Input */}
        <div className="mb-3">
          <label className="text-xs font-medium text-[#DDD6FE] mb-1 block">ভিডিওর নাম / শিরোনাম:</label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="যেমন: ফ্রিল্যান্সিংয়ে দ্রুত কাজ পাওয়ার উপায়..."
            className="w-full px-3.5 py-2 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/25 text-sm text-white placeholder-[#A7A3C2]/50 focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        {/* Monospace Script Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={rawScript}
            onChange={(e) => onScriptChange(e.target.value)}
            rows={10}
            placeholder={`TITLE: আমার রিল টাইটেল\n\n## SCENE 1\nNARRATION: প্রথম দৃশ্যের ভয়েসওভার বাক্য...\nIMAGE: ভিজ্যুয়াল বর্ণনা...\n\n## SCENE 2\nNARRATION: দ্বিতীয় দৃশ্যের ভয়েসওভার বাক্য...\nIMAGE: ভিজ্যুয়াল বর্ণনা...`}
            className="w-full font-mono text-xs sm:text-sm p-4 bg-[#0B0B12] rounded-xl border border-[#8B5CF6]/30 text-[#F4F2FF] placeholder-[#A7A3C2]/40 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] leading-relaxed resize-y"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => handleAutoPlanScenes(rawScript)}
            className="px-4 py-2 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-[#DDD6FE] border border-[#8B5CF6]/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <span>🔄 স্ক্রিপ্ট থেকে দৃশ্য প্ল্যান তৈরি করুন</span>
          </button>
          <span className="text-[11px] text-[#A7A3C2]">
            মোট দৃশ্য: <strong className="text-white">{scenes.length}টি</strong>
          </span>
        </div>
      </div>

      {/* 3. Scene Planner & Coverage Validator */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#F4F2FF]">Scene Planner & Coverage Validator</h3>
            <p className="text-xs text-[#A7A3C2]">
              Fidelity Rule: প্রতিটি দৃশ্যে শুধুমাত্র স্ক্রিপ্টের আসল বাক্য ব্যবহৃত হয়েছে (নতুন তথ্য বানাবে না)
            </p>
          </div>

          {/* Coverage Status Badge */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            coverage.coveragePercentage >= 100
              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
              : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
          }`}>
            {coverage.coveragePercentage >= 100 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>কভারেজ: ১০০% (সকল বাক্য অন্তর্ভুক্ত)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>কভারেজ: {coverage.coveragePercentage}% (কিছু বাক্য বাদ পড়েছে)</span>
              </>
            )}
          </div>
        </div>

        {/* Coverage Progress Bar */}
        <div className="w-full bg-[#0B0B12] rounded-full h-2 mb-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              coverage.coveragePercentage >= 100
                ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                : 'bg-gradient-to-r from-[#F59E0B] to-[#8B5CF6]'
            }`}
            style={{ width: `${coverage.coveragePercentage}%` }}
          />
        </div>

        {/* Uncovered Sentences warning if any */}
        {coverage.uncoveredList.length > 0 && (
          <div className="p-3 mb-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-xs text-[#F59E0B]">
            <span className="font-semibold block mb-1">বাদ পড়া বাক্যসমূহ:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[#F59E0B]/80">
              {coverage.uncoveredList.slice(0, 3).map((s, idx) => (
                <li key={idx} className="truncate">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Scene List Cards */}
        <div className="space-y-3.5">
          {scenes.map((scene, idx) => (
            <div
              key={scene.id || idx}
              className="p-3.5 sm:p-4 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20 transition-all hover:border-[#8B5CF6]/40"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#8B5CF6] to-[#7C3AED] text-white flex items-center justify-center text-xs font-bold">
                    {scene.sceneNumber}
                  </span>
                  <span className="text-xs font-semibold text-[#DDD6FE]">দৃশ্য {scene.sceneNumber}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Component Visual Selector */}
                  <select
                    value={scene.component}
                    onChange={(e) => updateScene(idx, { component: e.target.value as ComponentVisualType })}
                    className="bg-[#14141D] text-[#A7A3C2] text-xs px-2.5 py-1 rounded-lg border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="visual_card">🖼️ ভিজ্যুয়াল কার্ড</option>
                    <option value="stat_big">📊 বড় স্ট্যাট / সংখ্যা</option>
                    <option value="feature_list">📋 চেকলিস্ট ফিচার</option>
                    <option value="price_duel">⚖️ তুলনা / প্রাইসিং</option>
                    <option value="chat_mock">💬 চ্যাট মেসেজ</option>
                    <option value="browser_mock">🌐 ব্রাউজার মকআপ</option>
                    <option value="cta_pill">🚀 কল টু অ্যাকশন</option>
                  </select>

                  <button
                    onClick={() => deleteScene(idx)}
                    disabled={scenes.length <= 1}
                    className="p-1 text-[#A7A3C2] hover:text-[#EF4444] disabled:opacity-30 transition-colors"
                    title="দৃশ্য মুছুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Headline */}
              <div className="mb-2">
                <input
                  type="text"
                  value={scene.headline}
                  onChange={(e) => updateScene(idx, { headline: e.target.value })}
                  placeholder="দৃশ্য শিরোনাম..."
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-[#14141D] rounded-lg border border-[#8B5CF6]/20 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Narration (voiceover_text) */}
              <div className="mb-2">
                <label className="text-[10px] text-[#A7A3C2] block mb-0.5">ভয়েসওভার টেক্সট (স্ক্রিপ্টের আসল বাক্য):</label>
                <textarea
                  value={scene.voiceover_text}
                  onChange={(e) => updateScene(idx, { voiceover_text: e.target.value, caption: e.target.value })}
                  rows={2}
                  className="w-full text-xs px-2.5 py-1.5 bg-[#14141D] rounded-lg border border-[#8B5CF6]/20 text-[#DDD6FE] focus:outline-none focus:border-[#8B5CF6] resize-none"
                />
              </div>

              {/* Visual Description */}
              <div>
                <label className="text-[10px] text-[#A7A3C2] block mb-0.5">ভিজ্যুয়াল বর্ণনা:</label>
                <input
                  type="text"
                  value={scene.visualDescription}
                  onChange={(e) => updateScene(idx, { visualDescription: e.target.value })}
                  placeholder="ভিজ্যুয়াল বর্ণনা ও ব্যাকগ্রাউন্ড..."
                  className="w-full text-[11px] px-2.5 py-1.5 bg-[#14141D] rounded-lg border border-[#8B5CF6]/20 text-[#A7A3C2] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Scene Button */}
        <button
          onClick={addNewScene}
          className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-[#8B5CF6]/40 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10 text-xs font-semibold text-[#DDD6FE] transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>নতুন দৃশ্য যোগ করুন</span>
        </button>
      </div>

      {/* Next Step CTA */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#8B5CF6]/25 active:scale-95 flex items-center gap-2"
        >
          <span>পরবর্তী ধাপ: Format</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
