import { Scene, AspectRatioType, TemplateType, SubtitleConfig, MotionConfig, VoiceConfig, ResolutionType } from '../types';
import { getAudioContext, generateProceduralBgMusic, generateProceduralWhooshSound, decodeBase64AudioToBuffer } from './audioSynthesis';

export interface CanvasDimensions {
  width: number;
  height: number;
}

// Full target resolutions without upscaling
export function getTargetResolutionDimensions(aspect: AspectRatioType, resolution: ResolutionType = '1080p'): CanvasDimensions {
  if (resolution === '720p') {
    switch (aspect) {
      case '9:16': return { width: 720, height: 1280 };
      case '16:9': return { width: 1280, height: 720 };
      case '1:1': return { width: 720, height: 720 };
      case '4:5': return { width: 720, height: 900 };
    }
  }
  if (resolution === '1440p') {
    switch (aspect) {
      case '9:16': return { width: 1440, height: 2560 };
      case '16:9': return { width: 2560, height: 1440 };
      case '1:1': return { width: 1440, height: 1440 };
      case '4:5': return { width: 1440, height: 1800 };
    }
  }
  if (resolution === '4K') {
    switch (aspect) {
      case '9:16': return { width: 2160, height: 3840 };
      case '16:9': return { width: 3840, height: 2160 };
      case '1:1': return { width: 2160, height: 2160 };
      case '4:5': return { width: 2160, height: 2700 };
    }
  }
  // Standard 1080p Full HD (Default)
  switch (aspect) {
    case '9:16': return { width: 1080, height: 1920 };
    case '16:9': return { width: 1920, height: 1080 };
    case '1:1': return { width: 1080, height: 1080 };
    case '4:5': return { width: 1080, height: 1350 };
  }
}

export function getResolutionDescription(aspect: AspectRatioType, resolution: ResolutionType = '1080p'): string {
  const dims = getTargetResolutionDimensions(aspect, resolution);
  const resLabel = resolution === '1080p' ? 'Full HD' : (resolution === '4K' ? 'Ultra HD 4K' : (resolution === '1440p' ? '2K' : 'HD'));
  return `📐 ${dims.width}×${dims.height} • ${resLabel}`;
}

export function getResolutionDimensions(aspect: AspectRatioType, isExport: boolean = false, resolution: ResolutionType = '1080p'): CanvasDimensions {
  if (isExport) {
    return getTargetResolutionDimensions(aspect, resolution);
  }
  // Balanced preview size
  switch (aspect) {
    case '9:16': return { width: 540, height: 960 };
    case '16:9': return { width: 960, height: 540 };
    case '1:1': return { width: 640, height: 640 };
    case '4:5': return { width: 576, height: 720 };
  }
}

// Ease out expo for ultra-smooth premium camera easing
export function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

// Word wrapper for Canvas with safety margins
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// Render a single frame onto the canvas
export function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: Scene,
  sceneIndex: number,
  totalScenes: number,
  progress: number, // 0 to 1 inside current scene
  template: TemplateType,
  subtitles: SubtitleConfig,
  motion: MotionConfig,
  title: string
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Ken Burns Camera Motion Transform
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;

  if (motion.kenBurnsEnabled) {
    const easedProgress = easeOutExpo(progress);
    switch (motion.cameraMotion) {
      case 'slow_zoom':
        scale = 1.0 + 0.12 * easedProgress;
        break;
      case 'organic_breathe':
        scale = 1.0 + 0.05 * Math.sin(progress * Math.PI);
        break;
      case 'pan_left_right':
        scale = 1.08;
        offsetX = (progress - 0.5) * 40;
        break;
      case 'static':
      default:
        scale = 1.0;
        break;
    }
  }

  // Apply Camera Center transform
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2 + offsetX, -height / 2 + offsetY);

  // 2. Background Drawing based on Template
  const isDark = template === 'dark_neon';
  if (isDark) {
    // Dark Neon Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0B0B12');
    bgGrad.addColorStop(0.5, '#12101F');
    bgGrad.addColorStop(1, '#1A1233');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric ambient glowing orbs
    ctx.save();
    const orbGrad = ctx.createRadialGradient(
      width * 0.5 + Math.sin(progress * 2) * 40,
      height * 0.4,
      10,
      width * 0.5,
      height * 0.4,
      width * 0.6
    );
    orbGrad.addColorStop(0, 'rgba(139, 92, 246, 0.22)');
    orbGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.08)');
    orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Subtle tech grid lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 48;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  } else {
    // Light Pro Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FDFCFE');
    bgGrad.addColorStop(0.5, '#F4F1FB');
    bgGrad.addColorStop(1, '#EAE5F8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Soft light violet ambient orb
    const orbGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.35,
      20,
      width * 0.5,
      height * 0.35,
      width * 0.5
    );
    orbGrad.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
    orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = orbGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Top Header Bar & Progress Tracker
  const topPad = Math.max(30, height * 0.05);
  ctx.save();
  // Scene indicator pill
  const scenePillText = `দৃশ্য ${sceneIndex + 1} / ${totalScenes}`;
  ctx.font = `600 ${Math.max(13, Math.floor(width * 0.024))}px 'Hind Siliguri', sans-serif`;
  const pillMetrics = ctx.measureText(scenePillText);
  const pillW = pillMetrics.width + 28;
  const pillH = 32;
  const pillX = 36;
  const pillY = topPad;

  ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.12)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 999);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)';
  ctx.stroke();

  ctx.fillStyle = isDark ? '#DDD6FE' : '#6D28D9';
  ctx.fillText(scenePillText, pillX + 14, pillY + 21);

  // Overall progress bar at the very top edge
  const overallProg = (sceneIndex + progress) / totalScenes;
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
  ctx.fillRect(0, 0, width, 5);
  const progGrad = ctx.createLinearGradient(0, 0, width, 0);
  progGrad.addColorStop(0, '#8B5CF6');
  progGrad.addColorStop(1, '#A78BFA');
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, 0, width * overallProg, 5);
  ctx.restore();

  // 4. Central Visual Component Render
  const cardW = Math.min(width * 0.88, 760);
  const cardH = Math.min(height * 0.44, 460);
  const cardX = (width - cardW) / 2;
  const cardY = height * 0.22;

  drawComponentVisual(ctx, cardX, cardY, cardW, cardH, scene, isDark, progress);

  // 5. Headline Box (Above or on top of visual)
  ctx.save();
  const headlineFontSize = Math.max(22, Math.floor(width * 0.046));
  ctx.font = `700 ${headlineFontSize}px 'Hind Siliguri', sans-serif`;
  ctx.fillStyle = isDark ? '#FFFFFF' : '#1E1B4B';
  ctx.textAlign = 'center';
  const headlineLines = wrapCanvasText(ctx, scene.headline, cardW);
  const headlineY = cardY - 25 - (headlineLines.length - 1) * (headlineFontSize * 1.2);
  for (let i = 0; i < headlineLines.length; i++) {
    ctx.fillText(headlineLines[i], width / 2, headlineY + i * (headlineFontSize * 1.25));
  }
  ctx.restore();

  // Reset Camera Motion Transform before drawing fixed Subtitles
  ctx.restore();

  // 6. Subtitles Layer (fixed coordinates, auto-wrapping, no clipping)
  if (subtitles.enabled && scene.voiceover_text) {
    drawSubtitlesLayer(ctx, width, height, scene.voiceover_text, progress, subtitles, isDark);
  }

  // 7. Scene Transitions (Dissolve / Fade / Whip Pan)
  if (motion.transition !== 'hard_cut') {
    applySceneTransitionEffect(ctx, width, height, progress, motion.transition);
  }
}

// Render dynamic visual component inside scene
function drawComponentVisual(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scene: Scene,
  isDark: boolean,
  progress: number
): void {
  ctx.save();

  // Card background
  ctx.fillStyle = isDark ? 'rgba(20, 20, 29, 0.88)' : 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 20);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Render specific component types
  switch (scene.component) {
    case 'stat_big': {
      // Big stat showcase
      ctx.textAlign = 'center';
      const numMatch = scene.voiceover_text.match(/[০-৯0-9%]+/);
      const statVal = numMatch ? numMatch[0] : '১০০%';
      
      const numGrad = ctx.createLinearGradient(x, y + h * 0.3, x + w, y + h * 0.7);
      numGrad.addColorStop(0, '#8B5CF6');
      numGrad.addColorStop(1, '#C084FC');
      ctx.fillStyle = numGrad;
      ctx.font = `800 ${Math.floor(h * 0.32)}px 'Hind Siliguri', sans-serif`;
      ctx.fillText(statVal, x + w / 2, y + h * 0.48);

      ctx.fillStyle = isDark ? '#A7A3C2' : '#4B5563';
      ctx.font = `500 ${Math.floor(w * 0.038)}px 'Hind Siliguri', sans-serif`;
      const descLines = wrapCanvasText(ctx, scene.caption, w * 0.85);
      for (let i = 0; i < Math.min(2, descLines.length); i++) {
        ctx.fillText(descLines[i], x + w / 2, y + h * 0.68 + i * 26);
      }
      break;
    }

    case 'feature_list': {
      // 3 clean check items
      const items = [
        '১. মূল লক্ষ্যের উপর অবিচল মনোযোগ',
        '২. ক্লায়েন্টের চাহিদা অনুযায়ী সেরা সেবা',
        '৩. বাস্তব অভিজ্ঞতা ও নিয়মিত চর্চা'
      ];
      const startY = y + h * 0.25;
      const stepY = h * 0.24;
      items.forEach((item, idx) => {
        const itemY = startY + idx * stepY;
        // Check circle
        ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.12)';
        ctx.beginPath();
        ctx.arc(x + 40, itemY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B5CF6';
        ctx.font = '700 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', x + 40, itemY + 5);

        // Text
        ctx.textAlign = 'left';
        ctx.fillStyle = isDark ? '#F4F2FF' : '#1F2937';
        ctx.font = `600 ${Math.floor(w * 0.036)}px 'Hind Siliguri', sans-serif`;
        ctx.fillText(item, x + 70, itemY + 6);
      });
      break;
    }

    case 'browser_mock': {
      // Browser Mock frame
      ctx.fillStyle = isDark ? '#181824' : '#F3F4F6';
      ctx.beginPath();
      ctx.roundRect(x + 16, y + 16, w - 32, 34, 8);
      ctx.fill();

      // Browser dots
      ['#EF4444', '#F59E0B', '#10B981'].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x + 36 + i * 16, y + 33, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // URL bar
      ctx.fillStyle = isDark ? '#262638' : '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(x + 95, y + 22, w - 140, 22, 6);
      ctx.fill();
      ctx.fillStyle = isDark ? '#A7A3C2' : '#6B7280';
      ctx.font = '500 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🔒 https://reelstudio.app/project', x + 105, y + 37);

      // Web body preview
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? '#F4F2FF' : '#111827';
      ctx.font = `700 ${Math.floor(w * 0.04)}px 'Hind Siliguri', sans-serif`;
      ctx.fillText(scene.caption.slice(0, 36), x + w / 2, y + h * 0.65);
      break;
    }

    case 'chat_mock': {
      // Dual chat bubbles
      // Bubble 1 (Left)
      ctx.fillStyle = isDark ? '#1F1E2E' : '#E5E7EB';
      ctx.beginPath();
      ctx.roundRect(x + 30, y + h * 0.22, w * 0.65, 55, 14);
      ctx.fill();
      ctx.fillStyle = isDark ? '#F4F2FF' : '#1F2937';
      ctx.font = `500 ${Math.floor(w * 0.034)}px 'Hind Siliguri', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('💬 আপনার স্ক্রিপ্ট কি রেডি আছে?', x + 48, y + h * 0.22 + 34);

      // Bubble 2 (Right - Reply with purple)
      const grad = ctx.createLinearGradient(x + w * 0.3, 0, x + w - 30, 0);
      grad.addColorStop(0, '#8B5CF6');
      grad.addColorStop(1, '#7C3AED');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + w * 0.28, y + h * 0.52, w * 0.66, 55, 14);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('🚀 হ্যাঁ, ১ ক্লিকেই রিল ভিডিও তৈরি!', x + w * 0.28 + 20, y + h * 0.52 + 34);
      break;
    }

    case 'cta_pill': {
      // High conversion Call to Action
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? '#F4F2FF' : '#111827';
      ctx.font = `700 ${Math.floor(w * 0.044)}px 'Hind Siliguri', sans-serif`;
      ctx.fillText('আজই শুরু করুন', x + w / 2, y + h * 0.38);

      // CTA Button
      const btnW = Math.min(260, w * 0.7);
      const btnH = 50;
      const btnX = x + (w - btnW) / 2;
      const btnY = y + h * 0.55;

      const btnGrad = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
      btnGrad.addColorStop(0, '#8B5CF6');
      btnGrad.addColorStop(1, '#7C3AED');
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 999);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 16px "Hind Siliguri", sans-serif';
      ctx.fillText('✦ সাবস্ক্রাইব ও ফলো করুন', btnX + btnW / 2, btnY + 31);
      break;
    }

    case 'visual_card':
    default: {
      // Elegant visual scene frame with kinetic icon/spark
      ctx.textAlign = 'center';
      const iconGrad = ctx.createRadialGradient(x + w / 2, y + h * 0.45, 10, x + w / 2, y + h * 0.45, 60);
      iconGrad.addColorStop(0, '#8B5CF6');
      iconGrad.addColorStop(1, '#6D28D9');
      ctx.fillStyle = iconGrad;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.42, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 24px sans-serif';
      ctx.fillText('🎬', x + w / 2, y + h * 0.42 + 9);

      ctx.fillStyle = isDark ? '#E2E8F0' : '#1E293B';
      ctx.font = `600 ${Math.floor(w * 0.038)}px 'Hind Siliguri', sans-serif`;
      const lines = wrapCanvasText(ctx, scene.visualDescription || scene.caption, w * 0.82);
      for (let i = 0; i < Math.min(2, lines.length); i++) {
        ctx.fillText(lines[i], x + w / 2, y + h * 0.68 + i * 24);
      }
      break;
    }
  }

  ctx.restore();
}

// Draw subtitles layer
function drawSubtitlesLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  narration: string,
  progress: number,
  config: SubtitleConfig,
  isDark: boolean
): void {
  ctx.save();

  const fontSize = config.size === 'small' ? Math.floor(width * 0.036) : (config.size === 'large' ? Math.floor(width * 0.052) : Math.floor(width * 0.044));
  ctx.font = `700 ${fontSize}px '${config.font}', sans-serif`;
  ctx.textAlign = 'center';

  const maxSubW = width * 0.88;
  const words = narration.trim().split(/\s+/);
  const activeWordIdx = Math.min(words.length - 1, Math.floor(progress * words.length));

  // Determine vertical position
  const subY = config.position === 'top' ? height * 0.16 : height * 0.82;

  // Auto-wrap into lines
  const lines = wrapCanvasText(ctx, narration, maxSubW);
  const lineHeight = fontSize * 1.35;

  // Draw background box for clear legibility
  const totalBoxH = lines.length * lineHeight + 20;
  const boxTop = subY - 14 - (lines.length - 1) * (lineHeight / 2);

  ctx.fillStyle = isDark ? 'rgba(11, 11, 18, 0.78)' : 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.roundRect((width - maxSubW) / 2 - 14, boxTop, maxSubW + 28, totalBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw subtitle text based on animation style
  let accumulatedWords = 0;
  lines.forEach((line, lIdx) => {
    const curY = boxTop + 24 + lIdx * lineHeight;
    const lineWords = line.split(/\s+/);

    if (config.animation === 'classic') {
      // Classic: crisp outline
      ctx.strokeStyle = config.outlineColor || '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(line, width / 2, curY);
      ctx.fillStyle = config.textColor || '#FFFFFF';
      ctx.fillText(line, width / 2, curY);
    } else {
      // Word-by-word or Karaoke highlight
      // Calculate start X for centered line
      const lineWidth = ctx.measureText(line).width;
      let wordX = (width - lineWidth) / 2;

      lineWords.forEach((word) => {
        const wordMetric = ctx.measureText(word + ' ');
        const isCurrentWord = accumulatedWords === activeWordIdx;
        const isPastWord = accumulatedWords < activeWordIdx;

        if (config.animation === 'karaoke') {
          ctx.fillStyle = isPastWord || isCurrentWord ? config.highlightColor : config.textColor;
        } else {
          // Word-by-word pop
          ctx.fillStyle = isCurrentWord ? config.highlightColor : config.textColor;
        }

        ctx.strokeStyle = config.outlineColor || '#000000';
        ctx.lineWidth = 2.5;
        ctx.strokeText(word, wordX + wordMetric.width / 2, curY);
        ctx.fillText(word, wordX + wordMetric.width / 2, curY);

        wordX += wordMetric.width;
        accumulatedWords++;
      });
    }
  });

  ctx.restore();
}

// Scene transition effects
function applySceneTransitionEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  transition: string
): void {
  // Near beginning (<0.08) or near end (>0.92)
  const fadeThreshold = 0.08;
  if (transition === 'fade_violet') {
    if (progress > (1 - fadeThreshold)) {
      const alpha = (progress - (1 - fadeThreshold)) / fadeThreshold;
      ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
    } else if (progress < fadeThreshold) {
      const alpha = (fadeThreshold - progress) / fadeThreshold;
      ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (transition === 'cross_dissolve') {
    if (progress > (1 - fadeThreshold)) {
      const alpha = (progress - (1 - fadeThreshold)) / fadeThreshold;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (transition === 'whip_pan') {
    if (progress > (1 - fadeThreshold)) {
      const blurAlpha = (progress - (1 - fadeThreshold)) / fadeThreshold;
      ctx.fillStyle = `rgba(139, 92, 246, ${blurAlpha * 0.4})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}

// Export Video Recorder Engine
export async function renderVideoMP4(
  scenes: Scene[],
  title: string,
  aspect: AspectRatioType,
  resolution: ResolutionType,
  template: TemplateType,
  subtitles: SubtitleConfig,
  motion: MotionConfig,
  voice: VoiceConfig,
  onProgress: (progress: number, stepText: string) => void
): Promise<{ videoBlob: Blob; duration: number; filename: string }> {
  // Always true full resolution without upscaling
  const dims = getTargetResolutionDimensions(aspect, resolution);
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Crisp rendering configuration
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  onProgress(5, 'অডিও ট্র্যাক প্রস্তুত ও মিক্সিং...');

  const audioCtx = getAudioContext();
  const streamDest = audioCtx.createMediaStreamDestination();

  // Load / synthesize audio buffers for every scene
  const sceneAudioBuffers: (AudioBuffer | null)[] = [];
  const sceneDurations: number[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    let audioBuf: AudioBuffer | null = null;
    let dur = s.audioDuration || 4;

    try {
      if (s.audioBase64) {
        audioBuf = await decodeBase64AudioToBuffer(s.audioBase64);
        if (audioBuf && audioBuf.duration > 0) {
          dur = audioBuf.duration;
        }
      }
    } catch (e) {
      console.warn('Audio decode fallback for render', e);
    }

    sceneAudioBuffers.push(audioBuf);
    sceneDurations.push(dur);
  }

  const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);

  // Background Music setup with ducking
  let bgMusicSource: AudioBufferSourceNode | null = null;
  if (voice.bgMusicTrack !== 'none') {
    const bgBuffer = generateProceduralBgMusic(voice.bgMusicTrack, Math.ceil(totalDuration) + 5);
    bgMusicSource = audioCtx.createBufferSource();
    bgMusicSource.buffer = bgBuffer;
    bgMusicSource.loop = true;

    const bgGain = audioCtx.createGain();
    bgGain.gain.value = voice.bgMusicVolume * 0.4; // 15% ducked volume
    bgMusicSource.connect(bgGain);
    bgGain.connect(streamDest);
  }

  // Combine Canvas stream + Audio stream
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...streamDest.stream.getAudioTracks()
  ]);

  // Determine supported mime type with H.264 MP4 priority
  const mimeTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  let selectedMime = 'video/webm';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMime = mime;
      break;
    }
  }

  // High bitrate: 10,000,000 bps for 1080p, scaling for 1440p/4K
  const targetBitrate = resolution === '4K' ? 20_000_000 : (resolution === '1440p' ? 14_000_000 : 10_000_000);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: targetBitrate
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMime });
      const cleanName = title.replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_').slice(0, 30) || 'Reel';
      const filename = `ReelStudio_${cleanName}.mp4`;
      onProgress(100, 'ভিডিও সফলভাবে রেন্ডার সম্পন্ন!');
      resolve({ videoBlob: blob, duration: totalDuration, filename });
    };

    recorder.onerror = (e) => reject(e);

    // Start recording
    recorder.start(100);
    if (bgMusicSource) bgMusicSource.start();

    // Sound Design: Schedule subtle transition whoosh effects at scene cuts
    if (motion.transition !== 'hard_cut' && scenes.length > 1) {
      let cutOffset = 0;
      for (let cIdx = 0; cIdx < scenes.length - 1; cIdx++) {
        cutOffset += sceneDurations[cIdx];
        try {
          const whooshBuf = generateProceduralWhooshSound(0.4);
          const whooshSource = audioCtx.createBufferSource();
          whooshSource.buffer = whooshBuf;
          const whooshGain = audioCtx.createGain();
          whooshGain.gain.value = 0.22;
          whooshSource.connect(whooshGain);
          whooshGain.connect(streamDest);
          const startTime = Math.max(0, audioCtx.currentTime + cutOffset - 0.2);
          whooshSource.start(startTime);
        } catch (e) {}
      }
    }

    // Schedule per-scene voice audio accurately
    let scheduleOffset = 0;
    sceneAudioBuffers.forEach((buf, idx) => {
      if (buf) {
        const voiceSource = audioCtx.createBufferSource();
        voiceSource.buffer = buf;
        const voiceGain = audioCtx.createGain();
        voiceGain.gain.value = 1.0;
        voiceSource.connect(voiceGain);
        voiceGain.connect(streamDest);
        voiceSource.start(audioCtx.currentTime + scheduleOffset);
      }
      scheduleOffset += sceneDurations[idx];
    });

    // Wall-clock frame animation loop for exact A-V sync
    const fps = 30;
    const totalFrames = Math.ceil(totalDuration * fps);
    let currentFrame = 0;

    const renderInterval = setInterval(() => {
      if (currentFrame >= totalFrames) {
        clearInterval(renderInterval);
        setTimeout(() => {
          recorder.stop();
          if (bgMusicSource) {
            try { bgMusicSource.stop(); } catch (e) {}
          }
        }, 300);
        return;
      }

      const currentTime = currentFrame / fps;
      // Determine active scene
      let elapsed = 0;
      let activeSceneIdx = 0;
      let sceneProgress = 0;

      for (let i = 0; i < scenes.length; i++) {
        const d = sceneDurations[i];
        if (currentTime < elapsed + d || i === scenes.length - 1) {
          activeSceneIdx = i;
          sceneProgress = Math.min(1, Math.max(0, (currentTime - elapsed) / d));
          break;
        }
        elapsed += d;
      }

      drawSceneFrame(
        ctx,
        dims.width,
        dims.height,
        scenes[activeSceneIdx],
        activeSceneIdx,
        scenes.length,
        sceneProgress,
        template,
        subtitles,
        motion,
        title
      );

      const progressPct = 10 + Math.floor((currentFrame / totalFrames) * 85);
      const stepMsg = `ফ্রেম রেন্ডারিং (${currentFrame}/${totalFrames}) · দৃশ্য ${activeSceneIdx + 1}`;
      onProgress(progressPct, stepMsg);

      currentFrame++;
    }, 1000 / fps);
  });
}
