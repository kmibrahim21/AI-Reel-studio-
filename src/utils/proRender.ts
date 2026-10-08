import { Scene, AspectRatioType, TemplateType, SubtitleConfig, MotionConfig, VoiceConfig, ResolutionType } from '../types';
import { getTargetResolutionDimensions } from './videoRenderer';

export interface ProRenderJobPayload {
  jobId: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  scenesHtml: string;
  voiceover?: string;
  scenes?: Scene[];
  aspectRatio?: AspectRatioType;
  resolution?: ResolutionType;
}

/**
 * UTF-8 safe Base64 encoder for browser environments (supporting Bengali text & emojis)
 */
export function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * UTF-8 safe Base64 decoder
 */
export function base64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  } catch (e) {
    const binary = atob(b64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
}

/**
 * Mix all scene voices and audio into a single standalone 16-bit PCM WAV base64 string
 */
export async function mixAudioTracksToWav(
  scenes: Scene[],
  totalDuration: number
): Promise<string | undefined> {
  const scenesWithAudio = scenes.filter(s => s.audioBase64 && s.audioBase64.length > 50);
  if (scenesWithAudio.length === 0) {
    return undefined;
  }

  const sampleRate = 44100;
  const numChannels = 2;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * sampleRate));

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return undefined;

  const tempCtx = new AudioContextClass();
  const offlineCtx = new OfflineAudioContext(numChannels, totalFrames, sampleRate);

  let currentOffset = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const dur = s.audioDuration || 4.0;

    if (s.audioBase64) {
      try {
        let base64Data = s.audioBase64;
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let j = 0; j < binaryStr.length; j++) {
          bytes[j] = binaryStr.charCodeAt(j);
        }
        const audioBuf = await tempCtx.decodeAudioData(bytes.buffer);

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuf;

        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(1.0, currentOffset);
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        source.start(currentOffset);
      } catch (err) {
        console.warn(`[ProRender] Scene ${i} audio decode warning:`, err);
      }
    }
    currentOffset += dur;
  }

  try {
    tempCtx.close().catch(() => {});
  } catch {}

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBase64(renderedBuffer);
}

/**
 * Convert an AudioBuffer to a valid 16-bit PCM WAV data URL
 */
function audioBufferToWavBase64(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataByteLength = numSamples * blockAlign;
  const totalByteLength = 44 + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalByteLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Interleave channel samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 16384;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generate standalone, fully self-contained HTML document with embedded canvas rendering
 */
export function generateStandaloneScenesHtml(
  scenes: Scene[],
  aspectRatio: AspectRatioType,
  resolution: ResolutionType,
  template: TemplateType,
  subtitles: SubtitleConfig,
  motion: MotionConfig,
  voice: VoiceConfig,
  width: number,
  height: number
): string {
  const isDark = template === 'dark_neon';
  const scenesJson = JSON.stringify(scenes);
  const subtitlesJson = JSON.stringify(subtitles);
  const motionJson = JSON.stringify(motion);

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReelStudio Pro Render Stage</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${isDark ? '#090810' : '#FDFCFE'};
      font-family: 'Hind Siliguri', sans-serif;
    }
    #stage {
      display: block;
      width: ${width}px;
      height: ${height}px;
    }
  </style>
</head>
<body>
  <canvas id="stage" width="${width}" height="${height}"></canvas>

  <script>
    (function() {
      const WIDTH = ${width};
      const HEIGHT = ${height};
      const IS_DARK = ${isDark};
      const SCENES = ${scenesJson};
      const SUBTITLES = ${subtitlesJson};
      const MOTION = ${motionJson};

      const canvas = document.getElementById('stage');
      const ctx = canvas.getContext('2d', { alpha: false });

      // Compute timeline
      let runningOffset = 0;
      const timeline = SCENES.map(function(s, idx) {
        const dur = Math.max(1, Number(s.audioDuration || 4.0));
        const start = runningOffset;
        const end = runningOffset + dur;
        runningOffset = end;
        return {
          scene: s,
          index: idx,
          startTime: start,
          endTime: end,
          duration: dur
        };
      });
      const TOTAL_DURATION = Math.max(1, runningOffset);
      window.__totalDuration = TOTAL_DURATION;

      function wrapText(context, text, maxWidth) {
        if (!text) return [];
        const words = text.split(' ');
        const lines = [];
        let cur = words[0] || '';
        for (let i = 1; i < words.length; i++) {
          const test = cur + ' ' + words[i];
          if (context.measureText(test).width > maxWidth) {
            lines.push(cur);
            cur = words[i];
          } else {
            cur = test;
          }
        }
        if (cur) lines.push(cur);
        return lines;
      }

      function drawComponentVisual(ctx, x, y, w, h, scene, progress) {
        ctx.save();
        ctx.fillStyle = IS_DARK ? 'rgba(20, 20, 29, 0.92)' : 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 24);
        ctx.fill();
        ctx.strokeStyle = IS_DARK ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const comp = scene.component || 'stat_big';
        if (comp === 'stat_big') {
          ctx.textAlign = 'center';
          const numMatch = (scene.voiceover_text || '').match(/[০-৯0-9%]+/);
          const statVal = numMatch ? numMatch[0] : '১০০%';
          const grad = ctx.createLinearGradient(x, y + h * 0.3, x + w, y + h * 0.7);
          grad.addColorStop(0, '#8B5CF6');
          grad.addColorStop(1, '#C084FC');
          ctx.fillStyle = grad;
          ctx.font = '800 ' + Math.floor(h * 0.34) + 'px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          ctx.fillText(statVal, x + w / 2, y + h * 0.48);

          ctx.fillStyle = IS_DARK ? '#DDD6FE' : '#4B5563';
          ctx.font = '600 ' + Math.max(16, Math.floor(w * 0.038)) + 'px "Hind Siliguri", sans-serif';
          const descLines = wrapText(ctx, scene.caption || '', w * 0.85);
          for (let i = 0; i < Math.min(2, descLines.length); i++) {
            ctx.fillText(descLines[i], x + w / 2, y + h * 0.7 + (i * 32));
          }
        } else if (comp === 'feature_list') {
          const sourceText = scene.voiceover_text || scene.caption || '';
          const rawParts = sourceText
            .split(/[,।;\\n]+/)
            .map(function(s) { return s.trim(); })
            .filter(function(s) { return s.length > 2; });

          let items = [];
          if (rawParts.length >= 2) {
            items = rawParts.slice(0, 3).map(function(p, i) { return (i + 1) + '. ' + p; });
          } else {
            const words = sourceText.split(/\\s+/).filter(Boolean);
            if (words.length >= 6) {
              const partSize = Math.ceil(words.length / 3);
              const p1 = words.slice(0, partSize).join(' ');
              const p2 = words.slice(partSize, partSize * 2).join(' ');
              const p3 = words.slice(partSize * 2).join(' ');
              items = [p1, p2, p3].filter(Boolean).map(function(p, i) { return (i + 1) + '. ' + p; });
            } else {
              items = ['১. ' + sourceText];
            }
          }

          const startY = y + h * 0.25;
          const stepY = h * 0.24;
          items.forEach(function(item, idx) {
            const itemY = startY + (idx * stepY);
            ctx.fillStyle = IS_DARK ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)';
            ctx.beginPath();
            ctx.arc(x + 44, itemY, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8B5CF6';
            ctx.font = '700 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✓', x + 44, itemY + 5);

            ctx.textAlign = 'left';
            ctx.fillStyle = IS_DARK ? '#F4F2FF' : '#1F2937';
            ctx.font = '600 ' + Math.max(16, Math.floor(w * 0.036)) + 'px "Hind Siliguri", sans-serif';
            const truncated = item.length > 40 ? item.slice(0, 40) + '...' : item;
            ctx.fillText(truncated, x + 76, itemY + 6);
          });
        } else {
          // Default Visual Card / Mock
          ctx.textAlign = 'center';
          ctx.fillStyle = IS_DARK ? '#EDE9FE' : '#1E1B4B';
          ctx.font = '700 ' + Math.max(22, Math.floor(w * 0.044)) + 'px "Hind Siliguri", sans-serif';
          ctx.fillText(scene.caption || 'ReelStudio AI Pro', x + w / 2, y + h * 0.45);

          const btnW = Math.min(w * 0.7, 340);
          const btnH = 54;
          const btnX = x + (w - btnW) / 2;
          const btnY = y + h * 0.62;
          ctx.fillStyle = '#8B5CF6';
          ctx.beginPath();
          ctx.roundRect(btnX, btnY, btnW, btnH, 999);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 20px "Hind Siliguri", sans-serif';
          ctx.fillText('অ্যাকশন নিন 🚀', btnX + btnW / 2, btnY + 35);
        }
        ctx.restore();
      }

      function renderFrame(timeSec) {
        let entry = timeline[0];
        for (let i = 0; i < timeline.length; i++) {
          if (timeSec >= timeline[i].startTime && timeSec < timeline[i].endTime) {
            entry = timeline[i];
            break;
          }
        }
        if (!entry) entry = timeline[timeline.length - 1];

        const scene = entry.scene;
        const sceneProgress = Math.min(1, Math.max(0, (timeSec - entry.startTime) / entry.duration));

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        if (IS_DARK) {
          bgGrad.addColorStop(0, '#090810');
          bgGrad.addColorStop(0.5, '#120E22');
          bgGrad.addColorStop(1, '#08070D');
        } else {
          bgGrad.addColorStop(0, '#FDFCFE');
          bgGrad.addColorStop(0.5, '#F4F1FB');
          bgGrad.addColorStop(1, '#EAE5F8');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Ambient Orb
        ctx.save();
        const orbX = WIDTH * 0.5 + Math.sin(timeSec * 1.5) * 60;
        const orbY = HEIGHT * 0.38 + Math.cos(timeSec * 1.2) * 40;
        const orbGrad = ctx.createRadialGradient(orbX, orbY, 20, orbX, orbY, WIDTH * 0.55);
        orbGrad.addColorStop(0, IS_DARK ? 'rgba(139, 92, 246, 0.28)' : 'rgba(139, 92, 246, 0.16)');
        orbGrad.addColorStop(0.6, IS_DARK ? 'rgba(124, 58, 237, 0.08)' : 'rgba(139, 92, 246, 0.04)');
        orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = orbGrad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.restore();

        // Top progress bar
        const overallProg = Math.min(1, timeSec / TOTAL_DURATION);
        ctx.fillStyle = IS_DARK ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        ctx.fillRect(0, 0, WIDTH, 6);
        const progGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
        progGrad.addColorStop(0, '#8B5CF6');
        progGrad.addColorStop(1, '#C084FC');
        ctx.fillStyle = progGrad;
        ctx.fillRect(0, 0, WIDTH * overallProg, 6);

        // Scene Pill Badge
        ctx.save();
        const scenePill = 'দৃশ্য ' + (entry.index + 1) + ' / ' + timeline.length;
        ctx.font = '600 ' + Math.max(14, Math.floor(WIDTH * 0.024)) + 'px "Hind Siliguri", sans-serif';
        const pillW = ctx.measureText(scenePill).width + 32;
        ctx.fillStyle = IS_DARK ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.12)';
        ctx.beginPath();
        ctx.roundRect(40, 36, pillW, 36, 999);
        ctx.fill();
        ctx.strokeStyle = IS_DARK ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = IS_DARK ? '#DDD6FE' : '#6D28D9';
        ctx.fillText(scenePill, 56, 60);
        ctx.restore();

        // Headline
        ctx.save();
        const cardW = Math.min(WIDTH * 0.88, 820);
        const cardH = Math.min(HEIGHT * 0.44, 480);
        const cardX = (WIDTH - cardW) / 2;
        const cardY = HEIGHT * 0.24;

        const headlineSize = Math.max(26, Math.floor(WIDTH * 0.046));
        ctx.font = '700 ' + headlineSize + 'px "Hind Siliguri", sans-serif';
        ctx.fillStyle = IS_DARK ? '#FFFFFF' : '#1E1B4B';
        ctx.textAlign = 'center';
        const headlineLines = wrapText(ctx, scene.headline || '', cardW);
        const hlStartY = cardY - (headlineLines.length * (headlineSize + 8)) - 16;
        headlineLines.forEach(function(hl, idx) {
          ctx.fillText(hl, WIDTH / 2, hlStartY + idx * (headlineSize + 10));
        });
        ctx.restore();

        // Component Card
        drawComponentVisual(ctx, cardX, cardY, cardW, cardH, scene, sceneProgress);

        // Subtitles (Voiceover text)
        if (SUBTITLES.enabled && scene.voiceover_text) {
          ctx.save();
          const subFontSize = Math.max(20, Math.floor(WIDTH * 0.038));
          ctx.font = '700 ' + subFontSize + 'px "Hind Siliguri", sans-serif';
          ctx.textAlign = 'center';

          const subBoxW = Math.min(WIDTH * 0.9, 860);
          const subBoxY = HEIGHT * 0.82;
          ctx.fillStyle = IS_DARK ? 'rgba(10, 8, 20, 0.78)' : 'rgba(255, 255, 255, 0.92)';
          ctx.beginPath();
          ctx.roundRect((WIDTH - subBoxW) / 2, subBoxY - 45, subBoxW, 72, 20);
          ctx.fill();
          ctx.strokeStyle = IS_DARK ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          let txt = scene.voiceover_text;
          if (txt.length > 56) txt = txt.substring(0, 53) + '...';
          ctx.fillStyle = IS_DARK ? '#F8FAFC' : '#111827';
          ctx.fillText(txt, WIDTH / 2, subBoxY);
          ctx.restore();
        }

        // Scene boundary fade
        if (sceneProgress < 0.08) {
          const fade = 1 - (sceneProgress / 0.08);
          ctx.fillStyle = 'rgba(0, 0, 0, ' + (fade * 0.55) + ')';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
        } else if (sceneProgress > 0.92) {
          const fade = (sceneProgress - 0.92) / 0.08;
          ctx.fillStyle = 'rgba(0, 0, 0, ' + (fade * 0.55) + ')';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }
      }

      // Expose deterministic render function required by Pro Render Engine
      window.__render = renderFrame;
      window.__renderTime = renderFrame;
      window.__isReady = true;

      // Handle standalone playback if opened in browser without ?export=1
      const isExport = window.location.search.includes('export=1');
      if (!isExport) {
        let startTime = null;
        function animLoop(timestamp) {
          if (!startTime) startTime = timestamp;
          const elapsed = ((timestamp - startTime) / 1000) % TOTAL_DURATION;
          renderFrame(elapsed);
          requestAnimationFrame(animLoop);
        }
        requestAnimationFrame(animLoop);
      } else {
        // Initial frame for render
        renderFrame(0);
      }
    })();
  </script>
</body>
</html>`;

  // Safety net: Syntax-check <script> content before returning HTML
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    try {
      new Function(scriptMatch[1]);
    } catch (e: any) {
      throw new Error('Pro Render HTML-এ JavaScript syntax error: ' + e.message);
    }
  }

  return html;
}

/**
 * GitHub API: Upload Job JSON
 */
export async function uploadProRenderJob(
  repo: string,
  pat: string,
  jobId: string,
  payload: ProRenderJobPayload
): Promise<void> {
  // Safety net: Syntax-check scenesHtml script content before upload
  if (payload.scenesHtml) {
    const scriptMatch = payload.scenesHtml.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      try {
        new Function(scriptMatch[1]);
      } catch (e: any) {
        throw new Error('Pro Render HTML-এ JavaScript syntax error: ' + e.message);
      }
    }
  }

  const jsonContent = JSON.stringify(payload, null, 2);
  const base64Content = utf8ToBase64(jsonContent);

  const url = `https://api.github.com/repos/${repo}/contents/jobs/${jobId}.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `pro-render job ${jobId}`,
      content: base64Content
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub Job Upload Failed (${res.status})`);
  }
}

/**
 * GitHub API: Dispatch workflow
 */
export async function dispatchProRenderWorkflow(
  repo: string,
  pat: string,
  jobId: string
): Promise<void> {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/pro-render.yml/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        job_id: jobId
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub Workflow Dispatch Failed (${res.status})`);
  }
}

/**
 * GitHub API: Poll status JSON
 */
export async function checkProRenderStatus(
  repo: string,
  pat: string,
  jobId: string
): Promise<{ status: 'rendering' | 'done' | 'error'; message?: string }> {
  const url = `https://api.github.com/repos/${repo}/contents/renders/${jobId}.status.json?ref=renders`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (res.status === 404) {
    return { status: 'rendering' };
  }

  if (!res.ok) {
    return { status: 'rendering' };
  }

  try {
    const data = await res.json();
    if (data.content) {
      const decoded = base64ToUtf8(data.content);
      const parsed = JSON.parse(decoded);
      if (parsed.status === 'done') {
        return { status: 'done' };
      }
      if (parsed.status === 'error') {
        return { status: 'error', message: parsed.message || 'Render failed on cloud runner' };
      }
    }
  } catch (err) {
    console.warn('[ProRender] Status JSON parse warning:', err);
  }

  return { status: 'rendering' };
}

/**
 * Download Rendered MP4 Video
 */
export async function downloadProRenderVideoBlob(
  repo: string,
  pat: string,
  jobId: string
): Promise<Blob> {
  // Strategy 1: Raw GitHub UserContent
  const rawUrl = `https://raw.githubusercontent.com/${repo}/renders/renders/${jobId}.mp4`;
  try {
    const rawRes = await fetch(rawUrl, {
      headers: {
        Authorization: `Bearer ${pat}`
      }
    });
    if (rawRes.ok) {
      return await rawRes.blob();
    }
  } catch (e) {
    console.warn('[ProRender] Raw download fallback to GitHub API:', e);
  }

  // Strategy 2: GitHub Contents API with raw accept header
  const apiUrl = `https://api.github.com/repos/${repo}/contents/renders/${jobId}.mp4?ref=renders`;
  const apiRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github.v3.raw'
    }
  });

  if (!apiRes.ok) {
    throw new Error(`MP4 ডাউনলোড করতে ব্যর্থ হয়েছে (${apiRes.status})`);
  }

  return await apiRes.blob();
}
