export type WizardStep = 'script' | 'format' | 'subtitles' | 'motion' | 'voice';

export type AppMode = 'full_video' | 'ai_script' | 'images_only' | 'videos_only' | 'audio_only';

export type AppTab = 'studio' | 'projects' | 'history' | 'settings';

export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5';

export type ResolutionType = '720p' | '1080p' | '1440p' | '4K';

export type VisualType = 'images' | 'videos' | 'mixed';

export type TemplateType = 'light_pro' | 'dark_neon';

export type SubtitleAnimation = 'classic' | 'word_by_word' | 'karaoke';

export type SubtitleFont = 'Hind Siliguri' | 'Noto Sans Bengali';

export type SubtitleSize = 'small' | 'medium' | 'large';

export type SubtitlePosition = 'bottom' | 'top';

export type CameraMotion = 'organic_breathe' | 'slow_zoom' | 'pan_left_right' | 'static';

export type SceneTransition = 'hard_cut' | 'cross_dissolve' | 'whip_pan' | 'fade_violet';

export type TTSEngine = 'gemini' | 'elevenlabs' | 'browser';

export type VoiceName = 'Kore' | 'Aoede' | 'Charon' | 'Fenrir' | 'Puck';

export type ComponentVisualType = 
  | 'stat_big' 
  | 'feature_list' 
  | 'price_duel' 
  | 'chat_mock' 
  | 'browser_mock' 
  | 'cta_pill' 
  | 'visual_card';

export interface Scene {
  id: string;
  sceneNumber: number;
  headline: string;
  caption: string;
  voiceover_text: string;
  visualDescription: string;
  component: ComponentVisualType;
  audioBase64?: string;
  audioDuration?: number; // duration in seconds
  voiceStatus: 'ready' | 'pending' | 'failed' | 'fallback';
  voiceModelName?: string;
  fallbackReason?: string;
  voiceErrorReason?: string;
}

export interface SubtitleConfig {
  enabled: boolean;
  animation: SubtitleAnimation;
  font: SubtitleFont;
  size: SubtitleSize;
  position: SubtitlePosition;
  textColor: string;
  highlightColor: string;
  outlineColor: string;
}

export interface MotionConfig {
  kenBurnsEnabled: boolean;
  cameraMotion: CameraMotion;
  transition: SceneTransition;
}

export interface VoiceConfig {
  engine: TTSEngine;
  voiceName: VoiceName;
  bgMusicTrack: string;
  bgMusicVolume: number; // 0 to 1, default 0.15
}

export interface ProjectData {
  id: string;
  title: string;
  mode: AppMode;
  rawScript: string;
  scenes: Scene[];
  aspectRatio: AspectRatioType;
  resolution: ResolutionType;
  visualType: VisualType;
  template: TemplateType;
  subtitles: SubtitleConfig;
  motion: MotionConfig;
  voice: VoiceConfig;
  updatedAt: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  projectName: string;
  aspectRatio: AspectRatioType;
  duration: number; // seconds
  fileSizeMb: number;
  videoUrl: string;
  createdAt: string;
  status: 'completed' | 'failed';
}

export interface AppSettings {
  geminiApiKey: string;
  elevenLabsApiKey: string;
  defaultVoice: VoiceName;
  defaultTemplate: TemplateType;
  defaultEngine: TTSEngine;
  githubPat?: string;
  githubRepo?: string;
}
