import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Scene,
  AspectRatioType,
  TemplateType,
  SubtitleConfig,
  MotionConfig,
  VoiceConfig,
  ResolutionType
} from '../types';
import {
  getResolutionDimensions,
  getTargetResolutionDimensions,
  getResolutionDescription,
  drawSceneFrame,
  renderVideoMP4
} from '../utils/videoRenderer';
import {
  getAudioContext,
  playAudioUrl,
  stopVoicePreview,
  speakBrowserSpeech,
  generateProceduralBgMusic,
  playSfx
} from '../utils/audioSynthesis';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Film,
  Layers,
  Volume2,
  VolumeX,
  Rocket,
  Clock,
  X,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { getStoredGitHubPat, getStoredGitHubRepo } from '../utils/storage';
import {
  generateStandaloneScenesHtml,
  mixAudioTracksToWav,
  uploadProRenderJob,
  dispatchProRenderWorkflow,
  checkProRenderStatus,
  downloadProRenderVideoBlob,
  ProRenderJobPayload
} from '../utils/proRender';

interface VideoPreviewAndRenderProps {
  projectTitle: string;
  scenes: Scene[];
  aspectRatio: AspectRatioType;
  resolution: ResolutionType;
  template: TemplateType;
  subtitles: SubtitleConfig;
  motion: MotionConfig;
  voice: VoiceConfig;
  onOpenFacebookModal: () => void;
  onRenderComplete: (videoBlob: Blob, filename: string, duration: number) => void;
  onNavigateToSettings?: () => void;
}

export const VideoPreviewAndRender: React.FC<VideoPreviewAndRenderProps> = ({
  projectTitle,
  scenes,
  aspectRatio,
  resolution,
  template,
  subtitles,
  motion,
  voice,
  onOpenFacebookModal,
  onRenderComplete,
  onNavigateToSettings
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStepText, setRenderStepText] = useState('');
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedFilename, setRenderedFilename] = useState<string>('');

  // Pro Render (GitHub Cloud) States
  const [isProRendering, setIsProRendering] = useState(false);
  const [proRenderStep, setProRenderStep] = useState<'idle' | 'uploading' | 'rendering' | 'downloading' | 'done' | 'error'>('idle');
  const [proRenderElapsed, setProRenderElapsed] = useState(0);
  const [proRenderStatusText, setProRenderStatusText] = useState('');
  const [proRenderError, setProRenderError] = useState<string | null>(null);
  const [showPatMissingWarning, setShowPatMissingWarning] = useState(false);
  const activeJobIdRef = useRef<string | null>(null);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayingSceneIdxRef = useRef<number>(-1);
  const bgMusicNodeRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      stopVoicePreview();
      if (bgMusicNodeRef.current) {
        try {
          bgMusicNodeRef.current.source.stop();
        } catch (e) {}
        bgMusicNodeRef.current = null;
      }
      if (pollerRef.current) clearInterval(pollerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCancelProRender = () => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsProRendering(false);
    setProRenderStep('idle');
    setProRenderStatusText('');
    setProRenderError('প্রো রেন্ডার বাতিল করা হয়েছে');
  };

  const handleStartProRender = async () => {
    const pat = getStoredGitHubPat();
    const repo = getStoredGitHubRepo() || 'kmibrahim21/ReelStudio';

    if (!pat) {
      setShowPatMissingWarning(true);
      return;
    }
    setShowPatMissingWarning(false);
    setProRenderError(null);
    setIsPlaying(false);
    stopVoicePreview();

    const jobId = Date.now().toString(36);
    activeJobIdRef.current = jobId;
    setIsProRendering(true);
    setProRenderStep('uploading');
    setProRenderStatusText('⏳ Uploading job...');
    setProRenderElapsed(0);

    try {
      const targetDims = getTargetResolutionDimensions(aspectRatio, resolution);
      const scenesHtml = generateStandaloneScenesHtml(
        scenes,
        aspectRatio,
        resolution,
        template,
        subtitles,
        motion,
        voice,
        targetDims.width,
        targetDims.height
      );

      const voiceoverWav = await mixAudioTracksToWav(scenes, totalDuration);

      const payload: ProRenderJobPayload = {
        jobId,
        width: targetDims.width,
        height: targetDims.height,
        fps: 30,
        duration: totalDuration,
        scenesHtml,
        scenes,
        aspectRatio,
        resolution,
      };
      if (voiceoverWav) {
        payload.voiceover = voiceoverWav;
      }

      // 1. Upload Job JSON to GitHub Contents API
      await uploadProRenderJob(repo, pat, jobId, payload);

      // 2. Dispatch GitHub Actions workflow
      await dispatchProRenderWorkflow(repo, pat, jobId);

      // 3. Start Elapsed Timer & Polling
      setProRenderStep('rendering');
      setProRenderStatusText('☁️ Rendering on cloud... (0:00)');

      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setProRenderElapsed(seconds);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setProRenderStatusText(`☁️ Rendering on cloud... (${mins}:${secs < 10 ? '0' : ''}${secs})`);
      }, 1000);

      // Polling every 15 seconds
      pollerRef.current = setInterval(async () => {
        if (seconds >= 600) {
          // 10 minutes timeout
          if (pollerRef.current) clearInterval(pollerRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setIsProRendering(false);
          setProRenderStep('error');
          setProRenderError('⚠️ সময় শেষ — Actions tab-এ check করো');
          return;
        }

        try {
          const pollResult = await checkProRenderStatus(repo, pat, jobId);
          if (pollResult.status === 'done') {
            if (pollerRef.current) clearInterval(pollerRef.current);
            if (timerRef.current) clearInterval(timerRef.current);

            setProRenderStep('downloading');
            setProRenderStatusText('⬇️ Downloading...');

            const blob = await downloadProRenderVideoBlob(repo, pat, jobId);
            const filename = `ReelStudio_Pro_${jobId}.mp4`;

            // Auto download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setRenderedVideoUrl(url);
            setRenderedFilename(filename);
            onRenderComplete(blob, filename, totalDuration);

            setProRenderStep('done');
            setProRenderStatusText('✅ Done!');
            setIsProRendering(false);
          } else if (pollResult.status === 'error') {
            if (pollerRef.current) clearInterval(pollerRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setIsProRendering(false);
            setProRenderStep('error');
            setProRenderError(`❌ রেন্ডার ব্যর্থ — Actions tab-এ log দেখো (${pollResult.message || 'error'})`);
          }
        } catch (pollErr: any) {
          console.warn('[ProRender] Polling warning:', pollErr);
        }
      }, 15000);

    } catch (err: any) {
      if (pollerRef.current) clearInterval(pollerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProRendering(false);
      setProRenderStep('error');
      setProRenderError(`❌ ব্যর্থ: ${err.message || 'ক্লাউড রেন্ডার অনুরোধ পাঠানো যায়নি'}`);
    }
  };

  // Calculate individual scene durations and total duration
  const sceneDurations = scenes.map(s => s.audioDuration || 4.0);
  const totalDuration = sceneDurations.reduce((a, b) => a + b, 0) || 5;

  // Active scene index based on currentTime
  const getSceneAtTime = useCallback((time: number) => {
    let elapsed = 0;
    for (let i = 0; i < scenes.length; i++) {
      const d = sceneDurations[i];
      if (time < elapsed + d || i === scenes.length - 1) {
        const progress = Math.min(1, Math.max(0, (time - elapsed) / d));
        return { index: i, scene: scenes[i], progress };
      }
      elapsed += d;
    }
    return { index: 0, scene: scenes[0], progress: 0 };
  }, [scenes, sceneDurations]);

  // Redraw canvas whenever currentTime or configurations change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || scenes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { index, scene, progress } = getSceneAtTime(currentTime);
    drawSceneFrame(
      ctx,
      canvas.width,
      canvas.height,
      scene,
      index,
      scenes.length,
      progress,
      template,
      subtitles,
      motion,
      projectTitle
    );
  }, [currentTime, scenes, template, subtitles, motion, projectTitle, getSceneAtTime]);

  // Animation frame loop for playback
  useEffect(() => {
    let animId: number;
    let lastTimestamp: number | null = null;

    const loop = (timestamp: number) => {
      if (!isPlaying) return;
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration]);

  // Synchronize audio voiceover, SFX, and background music playback continuously across scene boundaries
  useEffect(() => {
    if (!isPlaying || isMuted) {
      stopVoicePreview();
      currentPlayingSceneIdxRef.current = -1;
      if (bgMusicNodeRef.current) {
        try { bgMusicNodeRef.current.source.stop(); } catch (e) {}
        bgMusicNodeRef.current = null;
      }
      return;
    }

    // Start background music loop if configured and not yet playing
    if (!bgMusicNodeRef.current && voice.bgMusicTrack !== 'none') {
      try {
        const audioCtx = getAudioContext();
        const bgBuffer = generateProceduralBgMusic(voice.bgMusicTrack, 60);
        const source = audioCtx.createBufferSource();
        source.buffer = bgBuffer;
        source.loop = true;

        const gain = audioCtx.createGain();
        // Ducked level while speaking
        gain.gain.value = voice.bgMusicVolume * 0.25;
        source.connect(gain);
        gain.connect(audioCtx.destination);
        source.start();
        bgMusicNodeRef.current = { source, gain };
      } catch (e) {}
    }

    const { index, scene } = getSceneAtTime(currentTime);
    if (index !== currentPlayingSceneIdxRef.current) {
      const prevIdx = currentPlayingSceneIdxRef.current;
      currentPlayingSceneIdxRef.current = index;
      stopVoicePreview();

      // Trigger SFX on scene transition
      if (prevIdx !== -1) {
        playSfx('whoosh', 0.2);
      }
      playSfx('pop', 0.15);

      if (scene.audioBase64) {
        playAudioUrl(scene.audioBase64).catch(() => {});
      } else if (voice.engine === 'browser' && scene.voiceover_text) {
        speakBrowserSpeech(scene.voiceover_text);
      }
    }
  }, [isPlaying, isMuted, currentTime, getSceneAtTime, voice.engine, voice.bgMusicTrack, voice.bgMusicVolume]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopVoicePreview();
      if (bgMusicNodeRef.current) {
        try { bgMusicNodeRef.current.source.stop(); } catch (e) {}
        bgMusicNodeRef.current = null;
      }
      currentPlayingSceneIdxRef.current = -1;
    } else {
      setIsPlaying(true);
      currentPlayingSceneIdxRef.current = -1; // Force immediate audio trigger for current scene
    }
  };

  // Toggle Mute / Unmute
  const handleToggleMute = () => {
    if (!isMuted) {
      stopVoicePreview();
      if (bgMusicNodeRef.current) {
        try { bgMusicNodeRef.current.source.stop(); } catch (e) {}
        bgMusicNodeRef.current = null;
      }
      setIsMuted(true);
    } else {
      setIsMuted(false);
      currentPlayingSceneIdxRef.current = -1;
    }
  };

  // Reset Scrubber
  const handleResetTimeline = () => {
    setIsPlaying(false);
    stopVoicePreview();
    if (bgMusicNodeRef.current) {
      try { bgMusicNodeRef.current.source.stop(); } catch (e) {}
      bgMusicNodeRef.current = null;
    }
    currentPlayingSceneIdxRef.current = -1;
    setCurrentTime(0);
  };

  // Timeline scrubber change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    stopVoicePreview();
    currentPlayingSceneIdxRef.current = -1;
    setCurrentTime(newTime);
  };

  // Format seconds to MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Start MP4 Video Generation
  const handleStartRender = async () => {
    if (scenes.length === 0) return;
    setIsPlaying(false);
    stopVoicePreview();
    if (bgMusicNodeRef.current) {
      try { bgMusicNodeRef.current.source.stop(); } catch (e) {}
      bgMusicNodeRef.current = null;
    }
    setIsRendering(true);
    setRenderProgress(0);
    setRenderStepText('ভিডিও প্রস্তুতি শুরু হচ্ছে...');

    try {
      const result = await renderVideoMP4(
        scenes,
        projectTitle || 'রিল_ভিডিও',
        aspectRatio,
        resolution,
        template,
        subtitles,
        motion,
        voice,
        (progress, step) => {
          setRenderProgress(progress);
          setRenderStepText(step);
        }
      );

      const url = URL.createObjectURL(result.videoBlob);
      setRenderedVideoUrl(url);
      setRenderedFilename(result.filename);
      onRenderComplete(result.videoBlob, result.filename, result.duration);
    } catch (err: any) {
      console.error('Render error', err);
      setRenderStepText(`ত্রুটি: ${err.message || 'রেন্ডার ব্যর্থ হয়েছে'}`);
    } finally {
      setIsRendering(false);
    }
  };

  // Aspect Ratio Canvas Dimensions
  const dims = getResolutionDimensions(aspectRatio, false);

  // Ready scenes count
  const readyScenes = scenes.filter(s => s.voiceStatus === 'ready').length;
  const missingVoiceCount = scenes.length - readyScenes;

  return (
    <div className="space-y-6">
      {/* 1. Canvas Preview & Scrubber */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)] glow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#F4F2FF]">রিয়েল-টাইম ক্যানভাস প্রিভিউ</h3>
            <p className="text-xs text-[#A7A3C2]">
              অ্যাসপেক্ট রেশিও: <strong className="text-[#DDD6FE]">{aspectRatio}</strong> · টেমপ্লেট: <strong className="text-[#DDD6FE]">{template === 'dark_neon' ? 'Dark Neon' : 'Light Pro'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#DDD6FE] bg-[#0B0B12] px-2.5 py-1 rounded-lg border border-[#8B5CF6]/30">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="w-full flex items-center justify-center bg-[#07070C] rounded-2xl p-2 sm:p-4 border border-[#8B5CF6]/20 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            className="max-h-[520px] w-auto h-auto rounded-xl shadow-2xl object-contain border border-[#8B5CF6]/30"
          />
        </div>

        {/* Timeline Scrubber & Player Controls */}
        <div className="mt-4 space-y-2">
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-[#8B5CF6] cursor-pointer"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'থামুন' : 'প্লে করুন'}</span>
              </button>

              <button
                onClick={handleResetTimeline}
                className="p-2.5 rounded-xl bg-[#0B0B12] hover:bg-white/5 text-[#A7A3C2] hover:text-white border border-[#8B5CF6]/25 transition-all text-xs active:scale-95"
                title="শুরুতে ফিরুন"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Mute/Unmute Toggle Button */}
              <button
                onClick={handleToggleMute}
                className={`p-2.5 rounded-xl border transition-all text-xs flex items-center gap-1.5 active:scale-95 ${
                  isMuted
                    ? 'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'bg-[#0B0B12] border-[#8B5CF6]/25 text-[#DDD6FE] hover:bg-white/5'
                }`}
                title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'মিউট' : 'সাউন্ড অন'}</span>
              </button>
            </div>

            {/* Current Scene Indicator */}
            <div className="text-xs text-[#A7A3C2]">
              চলতি দৃশ্য: <strong className="text-white">দৃশ্য {getSceneAtTime(currentTime).index + 1}</strong> / {scenes.length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pre-Render Configuration Overview */}
      <div className="p-4 sm:p-6 rounded-[18px] bg-[#14141D] border border-[rgba(139,92,246,0.18)]">
        <h4 className="text-sm font-semibold text-[#F4F2FF] mb-3">Pre-Render Configuration Overview</h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20">
            <span className="text-[#A7A3C2] block mb-1">টার্গেট রেজোলিউশন</span>
            <span className="font-semibold text-white font-mono block">
              {getResolutionDescription(aspectRatio, resolution)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20">
            <span className="text-[#A7A3C2] block mb-1">ভিজ্যুয়াল টেমপ্লেট</span>
            <span className="font-semibold text-white">{template === 'dark_neon' ? '🌃 Dark Neon v2' : '🌟 Light Pro v2'}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20">
            <span className="text-[#A7A3C2] block mb-1">সাবটাইটেল স্টাইল</span>
            <span className="font-semibold text-white">
              {subtitles.enabled ? `${subtitles.animation} (${subtitles.font})` : 'বন্ধ'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20">
            <span className="text-[#A7A3C2] block mb-1">ভয়েসওভার ও ব্যাকগ্রাউন্ড</span>
            <span className="font-semibold text-white">{voice.voiceName} ({readyScenes}/{scenes.length} প্রস্তুত)</span>
          </div>
        </div>

        {/* Warning if any scenes lack voiceover */}
        {missingVoiceCount > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/35 flex items-start gap-2.5 text-xs text-[#FDE68A] animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B] mt-0.5" />
            <div>
              <strong className="block text-white font-bold mb-0.5">⚠️ {missingVoiceCount}-টি scene-এ ভয়েস নেই</strong>
              <span>এখন এক্সপোর্ট করলে এই দৃশ্যগুলোতে ভয়েসওভার থাকবে না। পূর্ববর্তী ধাপ ৫ (Voice)-এ গিয়ে "সব দৃশ্যের ভয়েস তৈরি করো" বাটনে ক্লিক করতে পারেন।</span>
            </div>
          </div>
        )}

        {/* Facebook WebM upload guard notice */}
        <div className="mt-4 p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 flex items-start gap-2.5 text-xs text-[#DDD6FE]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#8B5CF6]" />
          <div>
            <strong className="block text-white">ফেসবুক আপলোড সতর্কবার্তা (Export Guard):</strong>
            ফেসবুক ও ইনস্টাগ্রামে সরাসরি রিলস আপলোডের জন্য MP4 (H.264/AAC) ফরম্যাট প্রস্তাবিত। ReelStudio স্বয়ংক্রিয়ভাবে ওয়াল-ক্লক ফ্রেম পেসিং বজায় রেখে MP4 ফাইল রেন্ডার করে।
          </div>
        </div>

        {/* Ready status indicator & Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#8B5CF6]/15">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isProRendering ? 'bg-[#8B5CF6] animate-pulse' : (readyScenes === scenes.length ? 'bg-[#22C55E] animate-ping' : 'bg-[#F59E0B]')}`} />
            <span className={`text-xs font-semibold ${readyScenes === scenes.length ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
              {isProRendering ? '☁️ Cloud Rendering Active' : (readyScenes === scenes.length ? '✓ Ready to Render' : `⚠️ ${readyScenes}/${scenes.length} ভয়েস প্রস্তুত`)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {/* Standard Generate Button */}
            <button
              onClick={handleStartRender}
              disabled={isRendering || isProRendering || scenes.length === 0}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#171524] hover:bg-[#221F36] text-[#DDD6FE] border border-[#8B5CF6]/30 font-semibold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              title="ব্রাউজারে রেন্ডার (দ্রুত)"
            >
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              <span>{isRendering ? 'লোকাল প্রসেসিং...' : 'Generate (লোকাল MP4)'}</span>
            </button>

            {/* Big Violet Pro Render Button */}
            <button
              onClick={handleStartProRender}
              disabled={isRendering || isProRendering || scenes.length === 0}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] hover:from-[#9061F9] hover:to-[#5B21B6] text-white font-bold text-sm sm:text-base transition-all glow-btn active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-lg shadow-[#8B5CF6]/30 border border-[#A78BFA]/50"
            >
              <Rocket className={`w-5 h-5 text-white ${isProRendering ? 'animate-bounce' : ''}`} />
              <span>
                {isProRendering
                  ? (proRenderStatusText || '☁️ Cloud রেন্ডার চলছে...')
                  : '🚀 Pro Render (High Quality)'}
              </span>
            </button>
          </div>
        </div>

        {/* Missing GitHub PAT Amber Warning Box */}
        {showPatMissingWarning && (
          <div className="mt-4 p-4 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#F59E0B]" />
              <div>
                <strong className="block text-sm font-bold text-white mb-0.5">
                  🔑 আগে Settings-এ GitHub PAT বসাও
                </strong>
                <span className="text-[#FDE68A]">
                  ক্লাউডে Pro Render চালাতে GitHub Personal Access Token (PAT) প্রয়োজন।
                </span>
              </div>
            </div>
            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold rounded-lg text-xs transition-all shrink-0 active:scale-95 shadow-md flex items-center gap-1.5 justify-center"
              >
                <span>সেটিংস খুলুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Pro Render Active Status & Cancel Bar */}
        {isProRendering && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#1C1635] to-[#120F24] border border-[#8B5CF6]/50 shadow-lg shadow-[#8B5CF6]/15 animate-in fade-in space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Rocket className="w-4 h-4 text-[#C084FC] animate-spin" />
                <span className="text-sm font-bold">{proRenderStatusText}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#0B0B12] border border-[#8B5CF6]/30 text-xs font-mono text-[#DDD6FE] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#A78BFA]" />
                  <span>{Math.floor(proRenderElapsed / 60)}:{(proRenderElapsed % 60).toString().padStart(2, '0')}</span>
                </span>
                <button
                  onClick={handleCancelProRender}
                  className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>বাতিল</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#A7A3C2] leading-relaxed">
              GitHub Actions রানার headless Chromium + FFmpeg দিয়ে 1080p হাই-কোয়ালিটি ভিডিও ফ্রেম বাই ফ্রেম বানাচ্ছে। এটি ১-৩ মিনিট সময় নিতে পারে।
            </p>
          </div>
        )}

        {/* Pro Render Error Banner */}
        {proRenderError && !isProRendering && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-red-300 mb-0.5">রেন্ডার স্ট্যাটাস:</strong>
              <span>{proRenderError}</span>
            </div>
          </div>
        )}

        {/* Live Rendering Progress Bar & Bangla step logs */}
        {isRendering && (
          <div className="mt-5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#DDD6FE] font-medium">{renderStepText}</span>
              <span className="font-mono text-[#8B5CF6] font-bold">{renderProgress}%</span>
            </div>
            <div className="w-full bg-[#0B0B12] rounded-full h-2.5 overflow-hidden border border-[#8B5CF6]/30">
              <div
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] transition-all duration-200"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Exported Video Success Card (Download & Facebook Post) */}
      {renderedVideoUrl && (
        <div className="p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[#1E1838] to-[#14141D] border border-[#8B5CF6] shadow-xl shadow-[#8B5CF6]/20 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 mb-3 text-[#22C55E]">
            <CheckCircle2 className="w-5 h-5" />
            <h4 className="text-base font-bold text-white">ভিডিও সফলভাবে তৈরি হয়েছে!</h4>
          </div>

          <p className="text-xs text-[#A7A3C2] mb-4">
            ফাইল নেম: <strong className="text-white font-mono">{renderedFilename}</strong> · সময়কাল: <strong className="text-white">{formatTime(totalDuration)}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={renderedVideoUrl}
              download={renderedFilename}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>MP4 ভিডিও ডাউনলোড করুন</span>
            </a>

            <button
              onClick={onOpenFacebookModal}
              className="px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>📘 Facebook-এ পোস্ট করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
