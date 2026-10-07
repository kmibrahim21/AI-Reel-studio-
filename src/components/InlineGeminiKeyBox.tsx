import React, { useState, useEffect, useRef } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { setStoredGeminiKey } from '../utils/storage';

interface InlineGeminiKeyBoxProps {
  currentKey: string;
  onKeySaved: (newKey: string) => void;
  autoFocus?: boolean;
}

export const InlineGeminiKeyBox: React.FC<InlineGeminiKeyBoxProps> = ({
  currentKey,
  onKeySaved,
  autoFocus = false,
}) => {
  const [keyInput, setKeyInput] = useState(currentKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(!currentKey);
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<{
    type: 'valid' | 'invalid' | 'quota' | 'error';
    text: string;
    detail?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKeyInput(currentKey || '');
    if (!currentKey) {
      setIsEditing(true);
    }
  }, [currentKey]);

  useEffect(() => {
    if (autoFocus && isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, isEditing]);

  const handleSave = () => {
    const trimmed = keyInput.trim();
    setStoredGeminiKey(trimmed);
    onKeySaved(trimmed);
    if (trimmed) {
      setIsEditing(false);
      handleCheckHealth(trimmed);
    }
  };

  const handleCheckHealth = async (keyToCheck: string) => {
    const trimmedKey = (keyToCheck || '').trim();
    if (!trimmedKey) {
      setCheckStatus({
        type: 'invalid',
        text: '❌ কোনো key দেওয়া হয়নি',
        detail: '⚠️ এই key-টি কাজ করছে না। aistudio.google.com → Get API key → Create API key থেকে নতুন key নিয়ে আবার চেষ্টা করো।'
      });
      return;
    }
    setIsChecking(true);
    setCheckStatus(null);

    try {
      const resp = await fetch('/api/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': trimmedKey
        },
        body: JSON.stringify({ customApiKey: trimmedKey })
      });
      const data = await resp.json();

      if (resp.ok && data.ok) {
        setCheckStatus({ type: 'valid', text: '✓ যুক্ত (সক্রিয় ও কার্যকরী)' });
      } else if (data.statusCategory === 'quota_exceeded' || data.code === 429) {
        setCheckStatus({
          type: 'quota',
          text: '⚠️ কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো',
          detail: 'আপনার Google AI Studio কোটার সীমা শেষ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।'
        });
      } else {
        const errorMsg = data.detailedHelp || '⚠️ এই key-টি কাজ করছে না। aistudio.google.com → Get API key → Create API key থেকে নতুন key নিয়ে আবার চেষ্টা করো।';
        setCheckStatus({
          type: 'invalid',
          text: '❌ অবৈধ key',
          detail: errorMsg
        });
      }
    } catch {
      setCheckStatus({
        type: 'error',
        text: '⚠️ নেটওয়ার্ক সমস্যা — আবার চেষ্টা করো',
        detail: 'ইন্টারনেট বা সার্ভার সংযোগে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      });
    } finally {
      setIsChecking(false);
    }
  };

  // If key is present and not currently editing: show compact saved banner
  if (currentKey && !isEditing) {
    const masked = currentKey.length > 8 ? `${currentKey.slice(0, 6)}...${currentKey.slice(-4)}` : '••••••••';
    return (
      <div className="p-3 rounded-xl bg-[#14141D] border border-[#8B5CF6]/30 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs">
          <Key className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-[#DDD6FE] font-medium">Gemini Key:</span>
          <span className="font-mono text-white bg-[#0B0B12] px-2 py-0.5 rounded border border-[#8B5CF6]/20">
            {masked}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] text-[11px] font-semibold flex items-center gap-1 border border-[#22C55E]/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>✓ যুক্ত</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCheckHealth(currentKey)}
            disabled={isChecking}
            className="px-2.5 py-1 text-[11px] font-medium text-[#DDD6FE] hover:text-white bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 rounded-lg transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>যাচাই</span>
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-2.5 py-1 text-[11px] font-medium text-[#A7A3C2] hover:text-white bg-[#0B0B12] hover:bg-white/5 border border-[#8B5CF6]/20 rounded-lg transition-colors"
          >
            কী পরিবর্তন
          </button>
        </div>
      </div>
    );
  }

  // When key is missing or being edited: show prominent amber inline box
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-[#F59E0B]/10 via-[#F59E0B]/5 to-transparent border border-[#F59E0B]/35 shadow-lg shadow-[#F59E0B]/5">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B] mb-1.5">
        <Key className="w-4 h-4 shrink-0" />
        <span>🔑 AI ব্যবহার করতে Gemini API key দাও</span>
      </div>
      <p className="text-[11px] text-[#A7A3C2] mb-3">
        স্ক্রিপ্ট জেনারেশন ও AI ভয়েসওভারের জন্য আপনার কীটি নিচে দিন। এটি ব্রাউজারের <code className="text-[#DDD6FE] font-mono">localStorage['reelstudio_gemini_key']</code>-এ নিরাপদভাবে সংরক্ষিত থাকবে।
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setCheckStatus(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="AIzaSy... অথবা AQ.... (Gemini API Key)"
            className="w-full pl-3.5 pr-9 py-2 bg-[#0B0B12] rounded-xl border border-[#F59E0B]/40 text-xs text-white placeholder-[#A7A3C2]/50 focus:outline-none focus:border-[#8B5CF6] font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-2.5 text-[#A7A3C2] hover:text-white"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save (সংরক্ষণ)</span>
          </button>

          <button
            onClick={() => handleCheckHealth(keyInput)}
            disabled={isChecking || !keyInput.trim()}
            className="px-3 py-2 bg-[#0B0B12] hover:bg-white/5 border border-[#8B5CF6]/30 text-[#DDD6FE] rounded-xl text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1 shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>✓ Check</span>
          </button>

          {currentKey && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-2 text-xs text-[#A7A3C2] hover:text-white"
            >
              বাতিল
            </button>
          )}
        </div>
      </div>

      {/* Validation status badge */}
      {checkStatus && (
        <div className={`mt-2.5 p-2.5 rounded-lg text-xs font-medium border animate-in fade-in duration-200 ${
          checkStatus.type === 'valid'
            ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
            : checkStatus.type === 'quota'
            ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            {checkStatus.type === 'valid' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {checkStatus.type === 'quota' && <AlertTriangle className="w-3.5 h-3.5" />}
            {checkStatus.type === 'invalid' && <XCircle className="w-3.5 h-3.5" />}
            <span>{checkStatus.text}</span>
          </div>
          {checkStatus.detail && (
            <div className="mt-1 text-[11px] font-normal leading-relaxed text-[#F4F2FF]/90">
              {checkStatus.detail}
              {checkStatus.type === 'invalid' && (
                <div className="mt-1">
                  👉 আসল কী পেতে যান:{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#DDD6FE] hover:text-white font-semibold"
                  >
                    aistudio.google.com/app/apikey
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
