import React, { useState } from 'react';
import { VoiceConfig, TTSEngine, VoiceName, Scene } from '../types';
import { InlineGeminiKeyBox } from './InlineGeminiKeyBox';
import {
  requestGeminiTTS,
  requestElevenLabsTTS,
  playAudioUrl,
  stopVoicePreview,
  speakBrowserSpeech,
  estimateBengaliSpeechDuration
} from '../utils/audioSynthesis';
import { Mic, Volume2, Play, Square, Sparkles, AlertTriangle, CheckCircle2, XCircle, Music, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step5VoiceProps {
  voice: VoiceConfig;
  onVoiceChange: (cfg: VoiceConfig) => void;
  scenes: Scene[];
  onScenesChange: (newScenes: Scene[]) => void;
  customGeminiKey?: string;
  customElevenLabsKey?: string;
  onGeminiKeyUpdate?: (key: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step5Voice: React.FC<Step5VoiceProps> = ({
  voice,
  onVoiceChange,
  scenes,
  onScenesChange,
  customGeminiKey = '',
  customElevenLabsKey,
  onGeminiKeyUpdate,
  onNext,
  onPrev
}) => {
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'failed'; text: string } | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [activeGeneratingIndex, setActiveGeneratingIndex] = useState<number | null>(null);

  const updateVoice = (partial: Partial<VoiceConfig>) => {
    onVoiceChange({ ...voice, ...partial });
  };

  // Helper to map error code to bangla reason
  const getBanglaErrorReason = (err: any): string => {
    const code = err.status || 500;
    if (code === 404) return 'মডেল পাওয়া যায়নি';
    if (code === 429) return 'কোটা শেষ';
    if (code === 401 || code === 403) return 'key-র অনুমতি নেই';
    if (code === 400) return 'অনুরোধে সমস্যা';
    return err.banglaReason || err.message || 'অনুরোধে সমস্যা';
  };

  // Single sentence voice test
  const handleTestVoice = async () => {
    stopVoicePreview();
    setIsPlayingTest(true);
    setTestResult(null);

    const testText = 'ReelStudio দিয়ে আপনার সোশ্যাল মিডিয়া রিল তৈরি করুন সহজেই।';

    if (voice.engine === 'browser') {
      speakBrowserSpeech(testText, () => {
        setIsPlayingTest(false);
        setTestResult({ status: 'success', text: '🌐 ব্রাউজার স্পিচ সফলভাবে বাজছে' });
      });
      return;
    }

    if (voice.engine === 'elevenlabs') {
      if (!customElevenLabsKey) {
        setTestResult({ status: 'failed', text: '❌ ভয়েস পরীক্ষা ব্যর্থ — ElevenLabs API Key অনুপস্থিত' });
        setIsPlayingTest(false);
        return;
      }
      try {
        const res = await requestElevenLabsTTS(testText, customElevenLabsKey);
        await playAudioUrl(res.audioUrl);
        setTestResult({ status: 'success', text: `🎙️ ElevenLabs ভয়েস সফল (${res.model})` });
      } catch (err: any) {
        const reason = getBanglaErrorReason(err);
        setTestResult({ status: 'failed', text: `❌ ভয়েস পরীক্ষা ব্যর্থ — ${reason}` });
      } finally {
        setIsPlayingTest(false);
      }
      return;
    }

    // Gemini TTS test (strict: NO buzzing tone fallback)
    try {
      const res = await requestGeminiTTS(testText, voice.voiceName, customGeminiKey);
      await playAudioUrl(res.audioUrl);
      setTestResult({ status: 'success', text: `🎙️ Gemini TTS প্রস্তুত (${res.model} · ${res.voiceName})` });
    } catch (err: any) {
      const reason = getBanglaErrorReason(err);
      // STRICT: Absolutely no buzzing sound or synthetic fallback tone!
      setTestResult({ status: 'failed', text: `❌ ভয়েস পরীক্ষা ব্যর্থ — ${reason}` });
    } finally {
      setIsPlayingTest(false);
    }
  };

  // Generate voice for a specific scene
  const generateVoiceForScene = async (idx: number) => {
    const s = scenes[idx];
    setActiveGeneratingIndex(idx);

    const updated = [...scenes];
    const estDuration = estimateBengaliSpeechDuration(s.voiceover_text);

    if (voice.engine === 'browser') {
      // Browser voice
      updated[idx] = {
        ...s,
        voiceStatus: 'ready',
        voiceModelName: 'Browser Speech (bn-BD)',
        audioDuration: estDuration,
        audioBase64: undefined
      };
      onScenesChange(updated);
      setActiveGeneratingIndex(null);
      return;
    }

    if (voice.engine === 'elevenlabs') {
      if (!customElevenLabsKey) {
        updated[idx] = {
          ...s,
          voiceStatus: 'failed',
          voiceErrorReason: 'ElevenLabs কী অনুপস্থিত',
          audioDuration: estDuration,
          audioBase64: undefined
        };
        onScenesChange(updated);
        setActiveGeneratingIndex(null);
        return;
      }
      try {
        const res = await requestElevenLabsTTS(s.voiceover_text, customElevenLabsKey);
        updated[idx] = {
          ...s,
          voiceStatus: 'ready',
          voiceModelName: res.model,
          audioDuration: res.duration,
          audioBase64: res.audioUrl,
          voiceErrorReason: undefined
        };
      } catch (err: any) {
        const reason = getBanglaErrorReason(err);
        updated[idx] = {
          ...s,
          voiceStatus: 'failed',
          voiceErrorReason: reason,
          audioDuration: estDuration,
          audioBase64: undefined
        };
      }
      onScenesChange(updated);
      setActiveGeneratingIndex(null);
      return;
    }

    // Gemini TTS (models: gemini-2.5-flash-preview-tts -> gemini-2.5-pro-preview-tts -> gemini-2.5-flash)
    try {
      const res = await requestGeminiTTS(s.voiceover_text, voice.voiceName, customGeminiKey);
      updated[idx] = {
        ...s,
        voiceStatus: 'ready',
        voiceModelName: res.model,
        audioDuration: res.duration,
        audioBase64: res.audioUrl,
        voiceErrorReason: undefined
      };
    } catch (err: any) {
      const reason = getBanglaErrorReason(err);
      // Strictly mark scene as failed without any synthetic buzzing tone
      updated[idx] = {
        ...s,
        voiceStatus: 'failed',
        voiceErrorReason: reason,
        audioDuration: estDuration,
        audioBase64: undefined
      };
    }

    onScenesChange(updated);
    setActiveGeneratingIndex(null);
  };

  // Generate voice for all scenes in sequence
  const handleGenerateAllVoices = async () => {
    setIsBatchGenerating(true);
    for (let i = 0; i < scenes.length; i++) {
      await generateVoiceForScene(i);
    }
    setIsBatchGenerating(false);
  };

  // Play individual scene audio preview
  const playSceneAudio = async (s: Scene) => {
    stopVoicePreview();
    if (s.audioBase64) {
      await playAudioUrl(s.audioBase64);
    } else if (voice.engine === 'browser') {
      speakBrowserSpeech(s.voiceover_text);
    } else {
      // Do NOT play buzzing sound!
      const statusReason = s.voiceErrorReason ? ` (${s.voiceErrorReason})` : '';
      alert(`⚠️ এই দৃশ্যের ভয়েস এখনও তৈরি করা হয়নি${statusReason}। অনুগ্রহ করে "ভয়েস তৈরি" বা "আবার চেষ্টা" বাটনে ক্লিক করুন।`);
    }
  };

  // Pre-export summary stats
  const readyVoiceCount = scenes.filter(s => s.voiceStatus === 'ready').length;
  const failedVoiceCount = scenes.filter(s => s.voiceStatus === 'failed').length;

  return (
    <div className="space-y-6">
      {/* 1. Voice Engine Selection */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h3 className="text-base font-semibold text-[#F4F2FF] mb-1">ভয়েস ইঞ্জিন (TTS Engine)</h3>
        <p className="text-xs text-[#A7A3C2] mb-4">
          আপনার পছন্দসই টেক্সট-টু-স্পিচ ইঞ্জিন নির্বাচন করুন। Gemini TTS-এ অগ্রাধিকারভিত্তিক মডেল সমর্থন রয়েছে।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            {
              id: 'gemini',
              title: '🎙️ Gemini TTS',
              desc: 'gemini-3.8-flash-lite-tts (উন্নত বাংলা বাচনভঙ্গি)',
              badge: 'প্রস্তাবিত'
            },
            {
              id: 'elevenlabs',
              title: '✨ ElevenLabs',
              desc: 'মাল্টিলিঙ্গুয়াল V2 বাংলা ভয়েস মডেল',
              badge: 'API Key'
            },
            {
              id: 'browser',
              title: '🌐 Browser Voice',
              desc: 'ব্রাউজারের ফ্রি বাংলা স্পিচ সিন্থেসিস',
              badge: 'FREE'
            },
          ].map((engine) => {
            const isSelected = voice.engine === engine.id;
            return (
              <button
                key={engine.id}
                onClick={() => updateVoice({ engine: engine.id as TTSEngine })}
                className={`p-4 rounded-[18px] text-left transition-all border relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#221B40] to-[#14141D] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-md shadow-[#8B5CF6]/20'
                    : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40 hover:bg-[#151522]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-white">{engine.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isSelected ? 'bg-[#8B5CF6] text-white' : 'bg-[#8B5CF6]/15 text-[#DDD6FE]'
                  }`}>
                    {engine.badge}
                  </span>
                </div>
                <p className="text-xs text-[#A7A3C2] leading-tight">{engine.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Voice Picker (Kore / Aoede / Charon / Fenrir / Puck) & Voice Test */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-[#F4F2FF]">ভয়েস চরিত্র নির্বাচন (Language: বাংলা)</h4>
            <p className="text-xs text-[#A7A3C2]">মিষ্টি ও সাবলীল বাংলা বাচনের জন্য Kore (ডিফল্ট) অথবা অন্যান্য চরিত্র বেছে নিন</p>
          </div>

          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            disabled={isPlayingTest}
            className="px-4 py-2 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/35 text-[#DDD6FE] border border-[#8B5CF6]/40 text-xs font-semibold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isPlayingTest ? <Square className="w-3.5 h-3.5 text-red-400" /> : <Play className="w-3.5 h-3.5" />}
            <span>🔊 ভয়েস টেস্ট</span>
          </button>
        </div>

        {/* Test Result outcome notification */}
        {testResult && (
          <div className={`p-3 mb-4 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
            testResult.status === 'success'
              ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
              : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
          }`}>
            {testResult.status === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Kore (Default) */}
          <button
            onClick={() => updateVoice({ voiceName: 'Kore' })}
            className={`p-3.5 rounded-[16px] text-left border transition-all ${
              voice.voiceName === 'Kore'
                ? 'bg-[#221B40] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-sm'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>👩‍💼 Kore</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#8B5CF6]/30 text-[#DDD6FE] rounded">ডিফল্ট</span>
              </span>
              {voice.voiceName === 'Kore' && (
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-[#A7A3C2] leading-tight">
              মিষ্টি, সাবলীল ও স্পষ্ট নারী কণ্ঠ — সোশ্যাল মিডিয়া রিল ও ব্যাখ্যার জন্য সেরা।
            </p>
          </button>

          {/* Aoede */}
          <button
            onClick={() => updateVoice({ voiceName: 'Aoede' })}
            className={`p-3.5 rounded-[16px] text-left border transition-all ${
              voice.voiceName === 'Aoede'
                ? 'bg-[#221B40] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-sm'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>👩‍💼 Aoede</span>
                <span className="text-[11px] text-[#A7A3C2]">(নারী)</span>
              </span>
              {voice.voiceName === 'Aoede' && (
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-[#A7A3C2] leading-tight">
              উষ্ণ, অমায়িক ও প্রাণবন্ত সামাজিক রিলস এবং টিউটোরিয়ালের জন্য উপযুক্ত।
            </p>
          </button>

          {/* Charon */}
          <button
            onClick={() => updateVoice({ voiceName: 'Charon' })}
            className={`p-3.5 rounded-[16px] text-left border transition-all ${
              voice.voiceName === 'Charon'
                ? 'bg-[#221B40] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-sm'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>👨‍💼 Charon</span>
                <span className="text-[11px] text-[#A7A3C2]">(পুরুষ)</span>
              </span>
              {voice.voiceName === 'Charon' && (
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-[#A7A3C2] leading-tight">
              গম্ভীর, আত্মবিশ্বাসী ও প্রফেশনাল এক্সপ্লেইনার ভিডিওর জন্য উপযুক্ত।
            </p>
          </button>

          {/* Fenrir */}
          <button
            onClick={() => updateVoice({ voiceName: 'Fenrir' })}
            className={`p-3.5 rounded-[16px] text-left border transition-all ${
              voice.voiceName === 'Fenrir'
                ? 'bg-[#221B40] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-sm'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>⚡ Fenrir</span>
                <span className="text-[11px] text-[#A7A3C2]">(পুরুষ)</span>
              </span>
              {voice.voiceName === 'Fenrir' && (
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-[#A7A3C2] leading-tight">
              উৎসাহী, তেজস্বী ও দ্রুতগতির মোটিভেশনাল বা বাণিজ্যিক ভিডিওর উপযোগী।
            </p>
          </button>

          {/* Puck */}
          <button
            onClick={() => updateVoice({ voiceName: 'Puck' })}
            className={`p-3.5 rounded-[16px] text-left border transition-all ${
              voice.voiceName === 'Puck'
                ? 'bg-[#221B40] border-[#8B5CF6] ring-1 ring-[#8B5CF6] shadow-sm'
                : 'bg-[#0B0B12] border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>🎭 Puck</span>
                <span className="text-[11px] text-[#A7A3C2]">(প্রাণবন্ত)</span>
              </span>
              {voice.voiceName === 'Puck' && (
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-[#A7A3C2] leading-tight">
              চঞ্চল, প্রাণখোলা ও চিত্তাকর্ষক স্টোরিটেলিং বা ভ্লগের জন্য দারুণ।
            </p>
          </button>
        </div>
      </div>

      {/* 3. Background Music & Ducking */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <div className="flex items-center gap-2 mb-3">
          <Music className="w-4 h-4 text-[#8B5CF6]" />
          <h4 className="text-sm font-semibold text-[#F4F2FF]">ব্যাকগ্রাউন্ড মিউজিক ও সাউন্ড ডিজাইন</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs text-[#DDD6FE] mb-1.5 block">মিউজিক ট্র্যাক নির্বাচন:</label>
            <select
              value={voice.bgMusicTrack}
              onChange={(e) => updateVoice({ bgMusicTrack: e.target.value })}
              className="w-full bg-[#0B0B12] text-xs text-white p-2.5 rounded-xl border border-[#8B5CF6]/30 focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="none">None (শুধু narration — কোনো ব্যাকগ্রাউন্ড সাউন্ড নেই)</option>
              <option value="lofi">🎧 Lo-Fi Chill (কোমল ও স্বস্তিদায়ক)</option>
              <option value="corporate">💼 Corporate Ambient (আধুনিক ও প্রফেশনাল)</option>
              <option value="dramatic">🎬 Dramatic Cinematic (গভীর সিনেমাটিক আবহ)</option>
              <option value="upbeat">⚡ Upbeat Vlog (প্রাণবন্ত ও ইতিবাচক)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#DDD6FE]">ভলিউম লেভেল:</span>
              <span className="font-mono text-[#8B5CF6] font-bold">{Math.round(voice.bgMusicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              value={voice.bgMusicVolume}
              onChange={(e) => updateVoice({ bgMusicVolume: parseFloat(e.target.value) })}
              className="w-full accent-[#8B5CF6] cursor-pointer"
            />
            <span className="text-[10px] text-[#A7A3C2] block mt-1">
              স্বয়ংক্রিয় অডিও ডাকিং সক্রিয় — কথা চলার সময় ব্যাকগ্রাউন্ড মিউজিক কমে যাবে।
            </span>
          </div>
        </div>
      </div>

      {/* 4. Scene-by-Scene Voiceover Generator & Status Badges */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-[#F4F2FF]">প্রতিটি দৃশ্যের ভয়েসওভার স্ট্যাটাস</h4>
            <p className="text-xs text-[#A7A3C2]">
              মডেলের অগ্রাধিকার: gemini-2.5-flash-preview-tts → gemini-2.5-pro-preview-tts → gemini-2.5-flash
            </p>
          </div>

          <button
            onClick={handleGenerateAllVoices}
            disabled={isBatchGenerating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBatchGenerating ? 'animate-spin' : ''}`} />
            <span>{isBatchGenerating ? 'ভয়েস তৈরি হচ্ছে...' : 'সব দৃশ্যের ভয়েস তৈরি করো'}</span>
          </button>
        </div>

        {/* Pre-export Summary Indicator */}
        <div className={`p-3 mb-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          readyVoiceCount === scenes.length && scenes.length > 0
            ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
            : failedVoiceCount > 0
            ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
            : 'bg-[#8B5CF6]/15 text-[#DDD6FE] border-[#8B5CF6]/30'
        }`}>
          {readyVoiceCount === scenes.length && scenes.length > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>🎙️ {readyVoiceCount}/{scenes.length} scene-এ AI ভয়েস প্রস্তুত</span>
            </>
          ) : failedVoiceCount > 0 ? (
            <>
              <XCircle className="w-4 h-4 shrink-0" />
              <span>❌ {failedVoiceCount}টি দৃশ্যে ভয়েস ব্যর্থ — নিচে "আবার চেষ্টা" করুন ({readyVoiceCount}/{scenes.length} প্রস্তুত)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>🎙️ {readyVoiceCount}/{scenes.length} দৃশ্য প্রস্তুত — "সব দৃশ্যের ভয়েস তৈরি করো" বাটনে ক্লিক করুন</span>
            </>
          )}
        </div>

        {/* Scene voice rows */}
        <div className="space-y-3">
          {scenes.map((scene, idx) => {
            const isGenerating = activeGeneratingIndex === idx;
            const isReady = scene.voiceStatus === 'ready';
            const isFailed = scene.voiceStatus === 'failed';

            return (
              <div
                key={scene.id || idx}
                className="p-3.5 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#DDD6FE]">দৃশ্য {scene.sceneNumber}:</span>
                    <span className="text-xs text-white truncate max-w-sm">{scene.headline}</span>
                  </div>
                  <p className="text-[11px] text-[#A7A3C2] truncate">{scene.voiceover_text}</p>
                </div>

                {/* Status Badges & Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Badge */}
                  {isReady ? (
                    <span className="px-2.5 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>✓ AI ভয়েস প্রস্তুত ({scene.voiceModelName || 'gemini'})</span>
                    </span>
                  ) : isFailed ? (
                    <span className="px-2.5 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-medium flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>❌ ভয়েস ব্যর্থ — {scene.voiceErrorReason || 'অনুরোধে সমস্যা'}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#A7A3C2] text-[11px]">
                      অপেক্ষমাণ
                    </span>
                  )}

                  {/* Play audio preview */}
                  <button
                    onClick={() => playSceneAudio(scene)}
                    className="p-1.5 rounded-lg bg-[#14141D] hover:bg-[#8B5CF6]/20 text-[#DDD6FE] border border-[#8B5CF6]/30 text-xs transition-colors"
                    title="ভয়েসওভার শুনুন"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  {/* Generate / Retry button */}
                  {isFailed ? (
                    <button
                      onClick={() => generateVoiceForScene(idx)}
                      disabled={isGenerating}
                      className="px-2.5 py-1 rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444]/35 text-[#EF4444] border border-[#EF4444]/40 text-[11px] font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>🔁 আবার চেষ্টা</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => generateVoiceForScene(idx)}
                      disabled={isGenerating}
                      className="px-2.5 py-1 rounded-lg bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 text-[#DDD6FE] border border-[#8B5CF6]/30 text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? '...' : (scene.voiceStatus === 'pending' ? 'ভয়েস তৈরি' : 'রি-জেনারেট')}
                    </button>
                  )}
                </div>
              </div>
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
          <span>আগের ধাপ: Motion</span>
        </button>

        <button
          onClick={onNext}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#8B5CF6]/25 active:scale-95 flex items-center gap-2"
        >
          <span>প্রিভিউ ও ভিডিও রেন্ডার ➔</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
