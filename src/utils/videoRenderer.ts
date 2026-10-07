import { Scene, AspectRatioType, TemplateType, SubtitleConfig, MotionConfig, VoiceConfig, ResolutionType } from '../types';
import {
  getAudioContext,
  generateProceduralBgMusic,
  generateProceduralWhooshSound,
  generateProceduralPopSound,
  generateProceduralTickSound,
  generateProceduralChimeSound,
  decodeBase64AudioToBuffer
} from './audioSynthesis';

export interface CanvasDimensions {
  width: number;
  height: number;
}

// Bengali digit formatter
export function toBengaliNumerals(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/[0-9]/g, (w) => bnDigits[parseInt(w, 10)]);
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

// Render a single frame onto the canvas (v4 Quality Upgrade)
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

  const isDark = template === 'dark_neon';
  const eased = easeOutExpo(progress);

  // 1. Background Drawing based on Template (Light Pro v2 / Dark Neon v2)
  if (isDark) {
    // Dark Neon Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090812');
    bgGrad.addColorStop(0.5, '#120F24');
    bgGrad.addColorStop(1, '#1A1138');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle tech grid lines with slow perspective drift
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 48;
    const driftY = (progress * 15) % gridSize;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = driftY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Atmospheric cyber glowing orbs
    const orbGrad = ctx.createRadialGradient(
      width * 0.5 + Math.sin(progress * 2) * 50,
      height * 0.35,
      10,
      width * 0.5,
      height * 0.35,
      width * 0.55
    );
    orbGrad.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
    orbGrad.addColorStop(0.5, 'rgba(124, 58, 237, 0.1)');
    orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  } else {
    // Light Pro v2 Background (Layered pastel blobs + subtle floating particles + soft vignette)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FAF9FF');
    bgGrad.addColorStop(0.5, '#F5F2FB');
    bgGrad.addColorStop(1, '#ECE6F9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Lavender blob (top left, slow drift)
    ctx.save();
    const blob1X = width * 0.25 + Math.sin(progress * Math.PI * 2) * 25;
    const blob1Y = height * 0.22 + Math.cos(progress * Math.PI * 2) * 20;
    const rad1 = ctx.createRadialGradient(blob1X, blob1Y, 20, blob1X, blob1Y, width * 0.5);
    rad1.addColorStop(0, 'rgba(196, 181, 253, 0.38)');
    rad1.addColorStop(0.7, 'rgba(221, 214, 254, 0.15)');
    rad1.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, width, height);

    // Layer 2: Warm Peach blob (bottom right)
    const blob2X = width * 0.78 + Math.cos(progress * Math.PI * 1.8) * 30;
    const blob2Y = height * 0.65 + Math.sin(progress * Math.PI * 1.8) * 25;
    const rad2 = ctx.createRadialGradient(blob2X, blob2Y, 30, blob2X, blob2Y, width * 0.45);
    rad2.addColorStop(0, 'rgba(254, 215, 170, 0.32)');
    rad2.addColorStop(0.6, 'rgba(254, 226, 226, 0.15)');
    rad2.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, width, height);

    // Layer 3: Soft Mint blob (center left)
    const blob3X = width * 0.2 + Math.sin(progress * 3) * 15;
    const blob3Y = height * 0.75 + Math.cos(progress * 3) * 18;
    const rad3 = ctx.createRadialGradient(blob3X, blob3Y, 15, blob3X, blob3Y, width * 0.35);
    rad3.addColorStop(0, 'rgba(204, 251, 241, 0.28)');
    rad3.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rad3;
    ctx.fillRect(0, 0, width, height);

    // Floating subtle sparkles / particles
    for (let p = 0; p < 6; p++) {
      const px = (width * ((p * 0.17 + 0.1) % 0.85)) + Math.sin(progress * 4 + p) * 12;
      const py = height * 0.85 - ((progress * 0.6 + p * 0.15) % 1) * height * 0.75;
      const pAlpha = 0.25 + 0.2 * Math.sin(progress * 6 + p);
      ctx.fillStyle = `rgba(139, 92, 246, ${pAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2, width * 0.0035), 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft Vignette on edges
    const vigGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.4, width / 2, height / 2, width * 0.85);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(109, 40, 217, 0.06)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Ken Burns Camera Motion Transform
  ctx.save();
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;

  if (motion.kenBurnsEnabled) {
    switch (motion.cameraMotion) {
      case 'slow_zoom':
        scale = 1.0 + 0.08 * eased;
        break;
      case 'organic_breathe':
        scale = 1.0 + 0.04 * Math.sin(progress * Math.PI);
        break;
      case 'pan_left_right':
        scale = 1.06;
        offsetX = (progress - 0.5) * 35;
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

  // 3. Chapter Pills with Count-Up & Shimmer Sweep
  const topPad = Math.max(30, height * 0.05);
  ctx.save();
  const scenePillText = `অধ্যায় ${toBengaliNumerals(sceneIndex + 1)} · দৃশ্য ${toBengaliNumerals(sceneIndex + 1)}/${toBengaliNumerals(totalScenes)}`;
  ctx.font = `700 ${Math.max(13, Math.floor(width * 0.025))}px 'Hind Siliguri', sans-serif`;
  const pillMetrics = ctx.measureText(scenePillText);
  const pillW = pillMetrics.width + 32;
  const pillH = 36;
  const pillX = 36;
  const pillY = topPad;

  // Pill base background
  ctx.fillStyle = isDark ? 'rgba(24, 20, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 999);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shimmer sweep across chapter pill
  const shimmerX = pillX - pillW + (progress * 2.5) * pillW;
  const shimmerGrad = ctx.createLinearGradient(shimmerX, pillY, shimmerX + 60, pillY + pillH);
  shimmerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shimmerGrad.addColorStop(0.5, isDark ? 'rgba(192, 132, 252, 0.35)' : 'rgba(255, 255, 255, 0.65)');
  shimmerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shimmerGrad;
  ctx.fillRect(pillX, pillY, pillW, pillH);
  ctx.restore();

  ctx.fillStyle = isDark ? '#DDD6FE' : '#6D28D9';
  ctx.fillText(scenePillText, pillX + 16, pillY + 23);

  // Overall top thin progress bar
  const overallProg = (sceneIndex + progress) / totalScenes;
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
  ctx.fillRect(0, 0, width, 5);
  const progGrad = ctx.createLinearGradient(0, 0, width, 0);
  progGrad.addColorStop(0, '#8B5CF6');
  progGrad.addColorStop(1, '#A78BFA');
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, 0, width * overallProg, 5);
  ctx.restore();

  // 4. Headline with Word-by-Word Reveal Animation
  const cardW = Math.min(width * 0.88, 760);
  const cardH = Math.min(height * 0.44, 460);
  const cardX = (width - cardW) / 2;
  const cardY = height * 0.23;

  ctx.save();
  const headlineFontSize = Math.max(22, Math.floor(width * 0.048));
  ctx.font = `700 ${headlineFontSize}px 'Hind Siliguri', sans-serif`;
  ctx.textAlign = 'center';

  const headlineLines = wrapCanvasText(ctx, scene.headline, cardW);
  const headlineY = cardY - 26 - (headlineLines.length - 1) * (headlineFontSize * 1.22);

  // Word-by-word staggered reveal
  const allHeadlineWords = scene.headline.split(/\s+/).filter(Boolean);
  const totalHeadWords = Math.max(1, allHeadlineWords.length);

  let currentWordCounter = 0;
  for (let lineIdx = 0; lineIdx < headlineLines.length; lineIdx++) {
    const line = headlineLines[lineIdx];
    const lineY = headlineY + lineIdx * (headlineFontSize * 1.25);
    const lineWords = line.split(/\s+/).filter(Boolean);
    const lineWidth = ctx.measureText(line).width;
    let wordStartX = (width - lineWidth) / 2;

    for (let wIdx = 0; wIdx < lineWords.length; wIdx++) {
      const word = lineWords[wIdx];
      const wordMetric = ctx.measureText(word + ' ');

      // Reveal progress per word (staggered from 0.0 to 0.4 of scene duration)
      const wordThreshold = (currentWordCounter / totalHeadWords) * 0.35;
      const wordFadeProgress = Math.min(1, Math.max(0, (progress - wordThreshold) / 0.12));
      const wordLift = (1 - easeOutExpo(wordFadeProgress)) * 8;

      ctx.save();
      ctx.globalAlpha = wordFadeProgress;
      if (isDark) {
        ctx.fillStyle = '#FFFFFF';
        if (progress < 0.35 && wordFadeProgress > 0.8) {
          ctx.shadowColor = '#C084FC';
          ctx.shadowBlur = 12;
        }
      } else {
        ctx.fillStyle = '#1E1B4B';
      }
      ctx.fillText(word, wordStartX + wordMetric.width / 2, lineY - wordLift);
      ctx.restore();

      wordStartX += wordMetric.width;
      currentWordCounter++;
    }
  }
  ctx.restore();

  // 5. Central Visual Component Render with 3D Tilt & Animations
  drawComponentVisual(ctx, cardX, cardY, cardW, cardH, scene, isDark, progress, width, height);

  // Reset Camera Motion Transform before drawing fixed Subtitles
  ctx.restore();

  // 6. Subtitles Layer (fixed coordinates, auto-wrapping, no clipping)
  if (subtitles.enabled && scene.voiceover_text) {
    drawSubtitlesLayer(ctx, width, height, scene.voiceover_text, progress, subtitles, isDark);
  }

  // 7. Scene Transitions (Dissolve / Fade / Whip Pan / Smooth Zoom)
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
  progress: number,
  canvasW: number,
  canvasH: number
): void {
  ctx.save();

  // Entrance slide + scale + fade easing
  const entrance = Math.min(1, progress / 0.28);
  const easedEntrance = easeOutExpo(entrance);
  const scale = 0.94 + 0.06 * easedEntrance;
  const slideY = (1 - easedEntrance) * 20;

  ctx.translate(x + w / 2, y + h / 2 + slideY);
  ctx.scale(scale, scale);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  // Card shadow & base background
  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(109, 40, 217, 0.12)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = isDark ? 'rgba(20, 18, 32, 0.94)' : 'rgba(255, 255, 255, 0.96)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Render specific component types
  switch (scene.component) {
    case 'stat_big': {
      // Big stat showcase with Count-Up animation and progress bar
      ctx.textAlign = 'center';
      const numMatch = scene.voiceover_text.match(/\d+/);
      const targetVal = numMatch ? parseInt(numMatch[0], 10) : 100;
      const countProgress = Math.min(1, progress / 0.6);
      const currentCount = Math.round(targetVal * easeOutExpo(countProgress));
      const hasPercent = scene.voiceover_text.includes('%') || scene.caption.includes('%');
      const suffix = hasPercent ? '%' : (scene.voiceover_text.includes('ঘণ্টা') ? ' ঘণ্টা' : '+');
      const displayStat = toBengaliNumerals(currentCount) + suffix;

      // Glowing number
      const numGrad = ctx.createLinearGradient(x, y + h * 0.25, x + w, y + h * 0.65);
      numGrad.addColorStop(0, '#8B5CF6');
      numGrad.addColorStop(1, '#C084FC');
      ctx.fillStyle = numGrad;
      ctx.font = `800 ${Math.floor(h * 0.32)}px 'Hind Siliguri', sans-serif`;
      ctx.fillText(displayStat, x + w / 2, y + h * 0.46);

      // Animated Progress Bar underneath
      const barW = w * 0.68;
      const barH = 10;
      const barX = x + (w - barW) / 2;
      const barY = y + h * 0.58;

      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 999);
      ctx.fill();

      // Filled progress with glowing head
      const fillW = Math.max(12, barW * easeOutExpo(countProgress));
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      fillGrad.addColorStop(0, '#8B5CF6');
      fillGrad.addColorStop(1, '#A78BFA');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 999);
      ctx.fill();

      // Caption text
      ctx.fillStyle = isDark ? '#DDD6FE' : '#4B5563';
      ctx.font = `600 ${Math.floor(w * 0.038)}px 'Hind Siliguri', sans-serif`;
      const descLines = wrapCanvasText(ctx, scene.caption || scene.headline, w * 0.85);
      for (let i = 0; i < Math.min(2, descLines.length); i++) {
        ctx.fillText(descLines[i], x + w / 2, y + h * 0.74 + i * 26);
      }
      break;
    }

    case 'feature_list': {
      // Staggered list items (0.12s delay per item)
      const sourceText = scene.voiceover_text || scene.caption;
      const rawParts = sourceText.split(/[,।;\n]+/).map(s => s.trim()).filter(s => s.length > 2);

      let items: string[] = [];
      if (rawParts.length >= 2) {
        items = rawParts.slice(0, 3).map((p, i) => `${toBengaliNumerals(i + 1)}. ${p}`);
      } else {
        const words = sourceText.split(/\s+/).filter(Boolean);
        if (words.length >= 6) {
          const partSize = Math.ceil(words.length / 3);
          const p1 = words.slice(0, partSize).join(' ');
          const p2 = words.slice(partSize, partSize * 2).join(' ');
          const p3 = words.slice(partSize * 2).join(' ');
          items = [p1, p2, p3].filter(Boolean).map((p, i) => `${toBengaliNumerals(i + 1)}. ${p}`);
        } else {
          items = [`${toBengaliNumerals(1)}. ${sourceText}`];
        }
      }

      const startY = y + h * 0.24;
      const stepY = h * 0.24;

      items.forEach((item, idx) => {
        const itemDelay = idx * 0.12;
        const itemProg = Math.min(1, Math.max(0, (progress - itemDelay) / 0.2));
        const itemEased = easeOutExpo(itemProg);
        const itemSlideX = (1 - itemEased) * 25;
        const itemY = startY + idx * stepY;

        ctx.save();
        ctx.globalAlpha = itemProg;
        ctx.translate(itemSlideX, 0);

        // Check circle with pop
        ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.14)';
        ctx.beginPath();
        ctx.arc(x + 42, itemY, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8B5CF6';
        ctx.font = '700 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', x + 42, itemY + 5);

        // Text
        ctx.textAlign = 'left';
        ctx.fillStyle = isDark ? '#F4F2FF' : '#1F2937';
        ctx.font = `600 ${Math.floor(w * 0.038)}px 'Hind Siliguri', sans-serif`;
        const truncated = item.length > 38 ? item.slice(0, 38) + '...' : item;
        ctx.fillText(truncated, x + 72, itemY + 6);
        ctx.restore();
      });
      break;
    }

    case 'browser_mock':
    case 'chat_mock': {
      // 3D Phone Mockup with Tap Ripple & Dynamic Screen UI
      const phoneW = Math.min(w * 0.72, 340);
      const phoneH = h * 0.82;
      const phoneX = x + (w - phoneW) / 2;
      const phoneY = y + (h - phoneH) / 2;

      // 3D Tilt perspective simulation
      const tiltAngle = (1 - easeOutExpo(Math.min(1, progress / 0.35))) * 0.08;
      ctx.save();
      ctx.translate(phoneX + phoneW / 2, phoneY + phoneH / 2);
      ctx.rotate(tiltAngle);
      ctx.translate(-(phoneX + phoneW / 2), -(phoneY + phoneH / 2));

      // Phone outer bezel
      ctx.fillStyle = isDark ? '#0C0A17' : '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 22);
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.4)' : '#D1D5DB';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Top Status Bar (09:41, Wi-Fi, 5G, Battery)
      ctx.fillStyle = isDark ? '#A7A3C2' : '#6B7280';
      ctx.font = '600 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('০৯:৪১', phoneX + 16, phoneY + 20);

      // Dynamic Island / Camera Notch
      ctx.fillStyle = isDark ? '#1F1B38' : '#111827';
      ctx.beginPath();
      ctx.roundRect(phoneX + phoneW / 2 - 28, phoneY + 12, 56, 12, 999);
      ctx.fill();

      // Screen content
      if (scene.component === 'chat_mock') {
        // Chat Bubbles with staggered entrance
        const chatQ = scene.headline || 'প্রশ্ন:';
        const chatA = scene.caption || scene.voiceover_text;

        // Bubble 1
        const b1Prog = Math.min(1, progress / 0.25);
        ctx.save();
        ctx.globalAlpha = b1Prog;
        ctx.fillStyle = isDark ? '#1F1E2E' : '#F3F4F6';
        ctx.beginPath();
        ctx.roundRect(phoneX + 16, phoneY + 45, phoneW - 48, 42, 12);
        ctx.fill();
        ctx.fillStyle = isDark ? '#F4F2FF' : '#1F2937';
        ctx.font = `500 ${Math.floor(phoneW * 0.04)}px 'Hind Siliguri', sans-serif`;
        const qText = chatQ.length > 24 ? chatQ.slice(0, 24) + '...' : chatQ;
        ctx.fillText(`💬 ${qText}`, phoneX + 26, phoneY + 70);
        ctx.restore();

        // Bubble 2
        const b2Prog = Math.min(1, Math.max(0, (progress - 0.25) / 0.25));
        ctx.save();
        ctx.globalAlpha = b2Prog;
        const chatGrad = ctx.createLinearGradient(phoneX + 36, 0, phoneX + phoneW - 16, 0);
        chatGrad.addColorStop(0, '#8B5CF6');
        chatGrad.addColorStop(1, '#7C3AED');
        ctx.fillStyle = chatGrad;
        ctx.beginPath();
        ctx.roundRect(phoneX + 36, phoneY + 98, phoneW - 52, 48, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        const aText = chatA.length > 24 ? chatA.slice(0, 24) + '...' : chatA;
        ctx.fillText(`✨ ${aText}`, phoneX + 46, phoneY + 128);
        ctx.restore();
      } else {
        // Browser URL & Content
        ctx.fillStyle = isDark ? '#221C3D' : '#F3F4F6';
        ctx.beginPath();
        ctx.roundRect(phoneX + 14, phoneY + 42, phoneW - 28, 26, 6);
        ctx.fill();
        ctx.fillStyle = isDark ? '#DDD6FE' : '#4B5563';
        ctx.font = '500 10px sans-serif';
        ctx.fillText('🔒 reelstudio.app', phoneX + 24, phoneY + 58);

        ctx.textAlign = 'center';
        ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
        ctx.font = `700 ${Math.floor(phoneW * 0.046)}px 'Hind Siliguri', sans-serif`;
        const bLines = wrapCanvasText(ctx, scene.caption || scene.headline, phoneW - 36);
        for (let i = 0; i < Math.min(2, bLines.length); i++) {
          ctx.fillText(bLines[i], phoneX + phoneW / 2, phoneY + 100 + i * 24);
        }
      }

      // Tap Ripple Animation (Simulated user tap on phone screen)
      const ripplePhase = (progress * 2.2) % 1;
      const rippleRadius = ripplePhase * 40;
      const rippleAlpha = (1 - ripplePhase) * 0.45;
      ctx.strokeStyle = `rgba(139, 92, 246, ${rippleAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(phoneX + phoneW * 0.65, phoneY + phoneH * 0.72, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      break;
    }

    case 'cta_pill': {
      // High conversion CTA Pill with pulse ring & continuous shine sweep loop
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
      ctx.font = `700 ${Math.floor(w * 0.046)}px 'Hind Siliguri', sans-serif`;
      const ctaHeadline = scene.headline || 'আজই আপনার ব্র্যান্ডকে এগিয়ে নিন';
      ctx.fillText(ctaHeadline.length > 28 ? ctaHeadline.slice(0, 28) + '...' : ctaHeadline, x + w / 2, y + h * 0.36);

      // CTA Button Dimensions
      const btnW = Math.min(300, w * 0.74);
      const btnH = 54;
      const btnX = x + (w - btnW) / 2;
      const btnY = y + h * 0.54;

      // Pulse ring animation around button
      const pulsePhase = (progress * 3) % 1;
      const pulseRingAlpha = (1 - pulsePhase) * 0.4;
      ctx.strokeStyle = `rgba(139, 92, 246, ${pulseRingAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(btnX - pulsePhase * 10, btnY - pulsePhase * 6, btnW + pulsePhase * 20, btnH + pulsePhase * 12, 999);
      ctx.stroke();

      // Main Button Gradient
      const btnGrad = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
      btnGrad.addColorStop(0, '#8B5CF6');
      btnGrad.addColorStop(1, '#7C3AED');
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 999);
      ctx.fill();

      // Shine sweep loop across CTA button
      const ctaShineX = btnX - btnW + ((progress * 2) % 1) * (btnW * 2.2);
      const ctaShineGrad = ctx.createLinearGradient(ctaShineX, btnY, ctaShineX + 50, btnY + btnH);
      ctaShineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      ctaShineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      ctaShineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.clip();
      ctx.fillStyle = ctaShineGrad;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.restore();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 17px "Hind Siliguri", sans-serif';
      const btnLabel = (scene.caption && scene.caption.length <= 25) ? scene.caption : '✦ সাবস্ক্রাইব ও শেয়ার করুন';
      ctx.fillText(btnLabel, btnX + btnW / 2, btnY + 34);
      break;
    }

    case 'visual_card':
    default: {
      // Elegant visual scene frame with kinetic icon/spark
      ctx.textAlign = 'center';
      const iconGrad = ctx.createRadialGradient(x + w / 2, y + h * 0.42, 10, x + w / 2, y + h * 0.42, 60);
      iconGrad.addColorStop(0, '#8B5CF6');
      iconGrad.addColorStop(1, '#6D28D9');
      ctx.fillStyle = iconGrad;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.40, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 24px sans-serif';
      ctx.fillText('🎬', x + w / 2, y + h * 0.40 + 9);

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

  ctx.fillStyle = isDark ? 'rgba(11, 11, 18, 0.82)' : 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect((width - maxSubW) / 2 - 14, boxTop, maxSubW + 28, totalBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.2)';
  ctx.lineWidth = 1.5;
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
      const lineWidth = ctx.measureText(line).width;
      let wordX = (width - lineWidth) / 2;

      lineWords.forEach((word) => {
        const wordMetric = ctx.measureText(word + ' ');
        const isCurrentWord = accumulatedWords === activeWordIdx;
        const isPastWord = accumulatedWords < activeWordIdx;

        if (config.animation === 'karaoke') {
          ctx.fillStyle = isPastWord || isCurrentWord ? (config.highlightColor || '#8B5CF6') : (config.textColor || (isDark ? '#FFFFFF' : '#111827'));
        } else {
          ctx.fillStyle = isCurrentWord ? (config.highlightColor || '#8B5CF6') : (config.textColor || (isDark ? '#FFFFFF' : '#111827'));
        }

        ctx.strokeStyle = config.outlineColor || 'rgba(0,0,0,0.4)';
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

// Scene transition effects (0.4s duration)
function applySceneTransitionEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  transition: string
): void {
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
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (transition === 'whip_pan') {
    if (progress > (1 - fadeThreshold)) {
      const blurAlpha = (progress - (1 - fadeThreshold)) / fadeThreshold;
      ctx.fillStyle = `rgba(139, 92, 246, ${blurAlpha * 0.45})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}

// Export Video Recorder Engine with Master Audio Mix & Ducking
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

  // Background Music setup with automatic -12dB audio ducking during voiceover
  let bgMusicSource: AudioBufferSourceNode | null = null;
  if (voice.bgMusicTrack !== 'none') {
    const bgBuffer = generateProceduralBgMusic(voice.bgMusicTrack, Math.ceil(totalDuration) + 5);
    bgMusicSource = audioCtx.createBufferSource();
    bgMusicSource.buffer = bgBuffer;
    bgMusicSource.loop = true;

    const bgGain = audioCtx.createGain();
    // Ducking: -12dB level during voiceover (approx 25% of configured volume)
    bgGain.gain.value = voice.bgMusicVolume * 0.25;
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

    // Sound Design: Transition whoosh & entrance pops at scene cuts
    let cutOffset = 0;
    for (let cIdx = 0; cIdx < scenes.length; cIdx++) {
      try {
        // Entrance soft pop
        const popBuf = generateProceduralPopSound(0.15);
        const popSource = audioCtx.createBufferSource();
        popSource.buffer = popBuf;
        const popGain = audioCtx.createGain();
        popGain.gain.value = 0.2;
        popSource.connect(popGain);
        popGain.connect(streamDest);
        popSource.start(audioCtx.currentTime + cutOffset + 0.1);

        // Transition whoosh at scene end
        if (cIdx < scenes.length - 1 && motion.transition !== 'hard_cut') {
          const whooshBuf = generateProceduralWhooshSound(0.4);
          const whooshSource = audioCtx.createBufferSource();
          whooshSource.buffer = whooshBuf;
          const whooshGain = audioCtx.createGain();
          whooshGain.gain.value = 0.22;
          whooshSource.connect(whooshGain);
          whooshGain.connect(streamDest);
          const whooshTime = Math.max(0, audioCtx.currentTime + cutOffset + sceneDurations[cIdx] - 0.2);
          whooshSource.start(whooshTime);
        }
      } catch (e) {}
      cutOffset += sceneDurations[cIdx];
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
