#!/usr/bin/env python3
"""
ReelStudio Pro Render Engine
Deterministic server-side / cloud video renderer using Playwright (Chromium) and FFmpeg.
Renders high-definition Bengali motion graphic reels with crisp typography, transitions, and audio mixing.
"""

import os
import sys
import json
import base64
import argparse
import subprocess
import math
import shutil
from pathlib import Path
from typing import Dict, Any, List

def parse_args():
    parser = argparse.ArgumentParser(description="ReelStudio Pro Render Engine")
    parser.add_argument("--job", required=True, help="Path to job JSON file (e.g. jobs/<job_id>.json)")
    parser.add_argument("--workdir", default="/tmp/pro-render", help="Working directory for frames & temporary files")
    parser.add_argument("--fps", type=int, default=30, help="Target frames per second (default 30)")
    parser.add_argument("--crf", type=int, default=18, help="FFmpeg CRF quality setting (default 18)")
    return parser.parse_args()

def get_dimensions(aspect_ratio: str, resolution: str) -> tuple[int, int]:
    is_1080p = (resolution or "1080p").lower() != "720p"
    if aspect_ratio == "9:16":
        return (1080, 1920) if is_1080p else (720, 1280)
    elif aspect_ratio == "1:1":
        return (1080, 1080) if is_1080p else (720, 720)
    elif aspect_ratio == "4:5":
        return (1080, 1350) if is_1080p else (720, 900)
    else:  # 16:9
        return (1920, 1080) if is_1080p else (1280, 720)

def generate_render_html(job_data: Dict[str, Any], width: int, height: int, fps: int) -> str:
    """Generate deterministic HTML + Canvas animation page that Playwright renders."""
    job_json = json.dumps(job_data, ensure_ascii=False)
    
    html = f"""<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
  
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body, html {{
    width: {width}px;
    height: {height}px;
    overflow: hidden;
    background: #09080F;
    font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Lohit Bengali', sans-serif;
  }}
  #stage {{
    position: absolute;
    top: 0;
    left: 0;
    width: {width}px;
    height: {height}px;
    display: block;
  }}
</style>
</head>
<body>
<canvas id="stage" width="{width}" height="{height}"></canvas>

<script>
const JOB = {job_json};
const WIDTH = {width};
const HEIGHT = {height};
const FPS = {fps};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', {{ alpha: false }});

// Precompute scene time offsets
let currentOffset = 0;
const sceneTimeline = (JOB.scenes || []).map((scene, idx) => {{
  const dur = Math.max(1, Number(scene.duration || scene.audioDuration || 4));
  const start = currentOffset;
  const end = currentOffset + dur;
  currentOffset = end;
  return {{
    ...scene,
    sceneIndex: idx,
    startTime: start,
    endTime: end,
    duration: dur
  }};
}});
const TOTAL_DURATION = currentOffset;

function wrapText(context, text, maxWidth) {{
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {{
    const testLine = currentLine + ' ' + words[i];
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth) {{
      lines.push(currentLine);
      currentLine = words[i];
    }} else {{
      currentLine = testLine;
    }}
  }}
  if (currentLine) lines.push(currentLine);
  return lines;
}}

function drawComponentVisual(ctx, x, y, w, h, scene, progress) {{
  const type = scene.visualType || 'stat_big';
  
  // Card glassmorphic container
  ctx.save();
  ctx.fillStyle = 'rgba(18, 16, 32, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle top glow highlight
  const topGrad = ctx.createLinearGradient(x, y, x + w, y);
  topGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
  topGrad.addColorStop(0.5, 'rgba(167, 139, 250, 0.4)');
  topGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.strokeStyle = topGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 30, y);
  ctx.lineTo(x + w - 30, y);
  ctx.stroke();
  ctx.restore();

  // Content inside Card
  ctx.save();
  if (type === 'stat_big') {{
    const statNum = scene.statNumber || scene.statValue || '10X+';
    const statLbl = scene.statLabel || scene.statSub || 'গ্রোথ ও রূপান্তর';
    
    // Scale bounce on entry
    const enterProg = Math.min(1, progress * 4);
    const scale = 0.85 + (0.15 * Math.sin(enterProg * Math.PI / 2));
    
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.45);
    ctx.scale(scale, scale);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.floor(h * 0.32) + 'px "Plus Jakarta Sans", sans-serif';
    const grad = ctx.createLinearGradient(-150, 0, 150, 0);
    grad.addColorStop(0, '#8B5CF6');
    grad.addColorStop(0.5, '#C084FC');
    grad.addColorStop(1, '#38BDF8');
    ctx.fillStyle = grad;
    ctx.fillText(statNum, 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 ' + Math.max(18, Math.floor(h * 0.09)) + 'px "Hind Siliguri", sans-serif';
    ctx.fillText(statLbl, x + w / 2, y + h * 0.76);

  }} else if (type === 'feature_list') {{
    const bullets = scene.bullets || ['স্মার্ট অটোমেশন', 'হাই-কনভার্টিং স্ক্রিপ্ট', 'ফুল এইচডি এক্সপোর্ট'];
    const itemH = h / (bullets.length + 1);
    
    bullets.forEach((b, i) => {{
      const itemY = y + (i + 1) * itemH;
      const itemProgress = Math.min(1, Math.max(0, (progress * 3) - (i * 0.3)));
      const alpha = itemProgress;
      const slideX = x + 40 + (1 - itemProgress) * 25;

      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Checkmark pill
      ctx.fillStyle = '#8B5CF6';
      ctx.beginPath();
      ctx.arc(slideX + 16, itemY - 6, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', slideX + 16, itemY - 2);

      // Text
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 ' + Math.max(16, Math.floor(h * 0.075)) + 'px "Hind Siliguri", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(b, slideX + 42, itemY);
      ctx.restore();
    }});

  }} else if (type === 'quote_card') {{
    const quote = scene.quoteText || scene.headline || 'গুণগত মান ছাড়া দীর্ঘমেয়াদী সাফল্য সম্ভব নয়।';
    const author = scene.quoteAuthor || '— ক্লায়েন্ট রিভিউ';

    ctx.font = 'italic 700 48px serif';
    ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.fillText('“', x + 40, y + 60);

    ctx.font = '500 ' + Math.max(18, Math.floor(h * 0.08)) + 'px "Hind Siliguri", sans-serif';
    ctx.fillStyle = '#EDE9FE';
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, quote, w - 80);
    lines.forEach((l, idx) => {{
      ctx.fillText(l, x + 40, y + 95 + idx * 34);
    }});

    ctx.font = '600 ' + Math.max(15, Math.floor(h * 0.065)) + 'px "Hind Siliguri", sans-serif';
    ctx.fillStyle = '#A78BFA';
    ctx.fillText(author, x + 40, y + h - 35);

  }} else if (type === 'price_duel') {{
    const leftP = scene.priceLeft || 'সাধারণ পদ্ধতি';
    const rightP = scene.priceRight || 'ReelStudio AI Pro';

    const colW = (w - 60) / 2;
    // Left Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(x + 20, y + 30, colW, h - 60, 16);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 18px "Hind Siliguri", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(leftP, x + 20 + colW / 2, y + 80);
    ctx.fillText('সময়: ৩ ঘণ্টা', x + 20 + colW / 2, y + 130);

    // Right Box (Hero Pro)
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.beginPath();
    ctx.roundRect(x + 40 + colW, y + 20, colW, h - 40, 16);
    ctx.fill();
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#A78BFA';
    ctx.font = '700 20px "Hind Siliguri", sans-serif';
    ctx.fillText(rightP, x + 40 + colW + colW / 2, y + 75);
    ctx.fillStyle = '#4ADE80';
    ctx.font = '700 22px "Hind Siliguri", sans-serif';
    ctx.fillText('সময়: ৩০ সেকেন্ড ⚡', x + 40 + colW + colW / 2, y + 130);

  }} else {{
    // Default CTA or visual
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 ' + Math.max(22, Math.floor(h * 0.1)) + 'px "Hind Siliguri", sans-serif';
    ctx.fillText(scene.ctaText || scene.headline || 'শুরু করুন এখনই', x + w / 2, y + h * 0.45);

    // Pulsing button
    const btnW = Math.min(w * 0.7, 340);
    const btnH = 56;
    const btnX = x + (w - btnW) / 2;
    const btnY = y + h * 0.62;
    
    ctx.fillStyle = '#8B5CF6';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 999);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 20px "Hind Siliguri", sans-serif';
    ctx.fillText('অ্যাকশন নিন 🚀', btnX + btnW / 2, btnY + 36);
  }}
  ctx.restore();
}}

function renderSceneFrame(timeSec) {{
  // Find current scene
  let scene = sceneTimeline[0];
  for (const s of sceneTimeline) {{
    if (timeSec >= s.startTime && timeSec < s.endTime) {{
      scene = s;
      break;
    }}
  }}
  if (!scene) scene = sceneTimeline[sceneTimeline.length - 1];

  const sceneProgress = Math.min(1, Math.max(0, (timeSec - scene.startTime) / scene.duration));

  // 1. Dark Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, '#090810');
  bgGrad.addColorStop(0.5, '#120E22');
  bgGrad.addColorStop(1, '#08070D');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Dynamic Ambient Glow Orbs
  ctx.save();
  const orbX = WIDTH * 0.5 + Math.sin(timeSec * 1.5) * 60;
  const orbY = HEIGHT * 0.4 + Math.cos(timeSec * 1.2) * 40;
  const orbGrad = ctx.createRadialGradient(orbX, orbY, 20, orbX, orbY, WIDTH * 0.55);
  orbGrad.addColorStop(0, 'rgba(139, 92, 246, 0.26)');
  orbGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.08)');
  orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Grid texture
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let gx = 0; gx < WIDTH; gx += gridSize) {{
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, HEIGHT);
    ctx.stroke();
  }}
  ctx.restore();

  // 3. Top Progress Bar
  const overallProg = Math.min(1, timeSec / TOTAL_DURATION);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, 0, WIDTH, 6);
  const progGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
  progGrad.addColorStop(0, '#8B5CF6');
  progGrad.addColorStop(1, '#C084FC');
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, 0, WIDTH * overallProg, 6);

  // Scene Pill Badge
  ctx.save();
  const scenePill = 'দৃশ্য ' + (scene.sceneIndex + 1) + ' / ' + sceneTimeline.length;
  ctx.font = '600 ' + Math.max(14, Math.floor(WIDTH * 0.024)) + 'px "Hind Siliguri", sans-serif';
  const pillW = ctx.measureText(scenePill).width + 30;
  ctx.fillStyle = 'rgba(139, 92, 246, 0.22)';
  ctx.beginPath();
  ctx.roundRect(40, 36, pillW, 36, 999);
  ctx.fill();
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#DDD6FE';
  ctx.fillText(scenePill, 55, 60);
  ctx.restore();

  // 4. Headline
  ctx.save();
  const headlineSize = Math.max(26, Math.floor(WIDTH * 0.046));
  ctx.font = '700 ' + headlineSize + 'px "Hind Siliguri", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';

  const cardW = Math.min(WIDTH * 0.88, 820);
  const cardH = Math.min(HEIGHT * 0.44, 480);
  const cardX = (WIDTH - cardW) / 2;
  const cardY = HEIGHT * 0.24;

  const headlineLines = wrapText(ctx, scene.headline || '', cardW);
  const hlStartY = cardY - (headlineLines.length * (headlineSize + 8)) - 16;
  headlineLines.forEach((hl, idx) => {{
    ctx.fillText(hl, WIDTH / 2, hlStartY + idx * (headlineSize + 10));
  }});
  ctx.restore();

  // 5. Visual Component
  drawComponentVisual(ctx, cardX, cardY, cardW, cardH, scene, sceneProgress);

  // 6. Subtitles (Voiceover text)
  const voiceText = scene.voiceover || scene.text || scene.headline || '';
  if (voiceText) {{
    ctx.save();
    const subFontSize = Math.max(20, Math.floor(WIDTH * 0.038));
    ctx.font = '700 ' + subFontSize + 'px "Hind Siliguri", sans-serif';
    ctx.textAlign = 'center';

    const words = voiceText.split(' ');
    const activeWordIdx = Math.min(words.length - 1, Math.floor(sceneProgress * words.length));
    
    // Subtitle Container Box
    const subBoxW = Math.min(WIDTH * 0.9, 860);
    const subBoxY = HEIGHT * 0.82;
    
    ctx.fillStyle = 'rgba(10, 8, 20, 0.75)';
    ctx.beginPath();
    ctx.roundRect((WIDTH - subBoxW) / 2, subBoxY - 45, subBoxW, 70, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Word highlight animation
    let fullSubText = voiceText;
    if (fullSubText.length > 55) fullSubText = fullSubText.substring(0, 52) + '...';
    
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(fullSubText, WIDTH / 2, subBoxY);
    ctx.restore();
  }}

  // 7. Transition effect (fade-in / fade-out at scene boundaries)
  if (sceneProgress < 0.08) {{
    const fade = 1 - (sceneProgress / 0.08);
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (fade * 0.6) + ')';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }} else if (sceneProgress > 0.92) {{
    const fade = (sceneProgress - 0.92) / 0.08;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (fade * 0.6) + ')';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }}
}}

// Expose rendering hook for Playwright
window.__renderTime = renderSceneFrame;
window.__totalDuration = TOTAL_DURATION;
window.__isReady = true;
</script>
</body>
</html>
"""
    return html

def extract_audio_tracks(job_data: Dict[str, Any], job_dir: Path) -> Path:
    """Save audio tracks for each scene and mix or concatenate with ffmpeg."""
    audio_dir = job_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    merged_voice = audio_dir / "voice_track.wav"

    # Direct combined voiceover in job JSON
    direct_vo = job_data.get("voiceover") or ""
    if direct_vo:
        if "base64," in direct_vo:
            direct_vo = direct_vo.split("base64,")[1]
        try:
            raw_data = base64.b64decode(direct_vo)
            with open(merged_voice, "wb") as f:
                f.write(raw_data)
            print(f"[Audio] Loaded direct mixed voiceover ({len(raw_data)} bytes)")
            return merged_voice
        except Exception as e:
            print(f"[Audio] Failed to decode direct voiceover: {e}", file=sys.stderr)

    scenes = job_data.get("scenes", [])
    audio_files = []
    
    for idx, scene in enumerate(scenes):
        dur = max(1.0, float(scene.get("duration") or scene.get("audioDuration") or 4.0))
        audio_b64 = scene.get("audioBase64") or scene.get("audioUrl") or ""
        out_wav = audio_dir / f"scene_{idx:03d}.wav"
        
        if audio_b64 and "base64," in audio_b64:
            raw_b64 = audio_b64.split("base64,")[1]
            try:
                data = base64.b64decode(raw_b64)
                with open(out_wav, "wb") as f:
                    f.write(data)
                audio_files.append((out_wav, dur))
                continue
            except Exception as e:
                print(f"[Audio] Error decoding scene {idx} audio: {e}", file=sys.stderr)
        
        # Fallback: Create silent WAV file of duration `dur`
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=stereo",
            "-t", str(dur),
            str(out_wav)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        audio_files.append((out_wav, dur))

    # Concatenate audio segments
    concat_list_file = audio_dir / "concat_list.txt"
    with open(concat_list_file, "w") as f:
        for fpath, _ in audio_files:
            f.write(f"file '{fpath.resolve()}'\n")
            
    merged_voice = audio_dir / "voice_track.wav"
    concat_cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c:a", "pcm_s16le",
        str(merged_voice)
    ]
    subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return merged_voice

def render_with_playwright(html_file: Path, job_dir: Path, width: int, height: int, fps: int, job_duration: float = None) -> Path:
    """Uses Playwright to capture frames and pipe directly to ffmpeg."""
    from playwright.sync_api import sync_playwright

    frames_dir = job_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[Pro Render] Starting Chromium to capture frames at {width}x{height} @ {fps}fps...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu"
            ]
        )
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(f"file://{html_file.resolve()}")
        
        # Wait for page readiness & fonts
        page.wait_for_function("window.__isReady === true || typeof window.__render === 'function' || typeof window.__renderTime === 'function'")
        page.evaluate("document.fonts && document.fonts.ready")
        
        total_duration = float(job_duration or page.evaluate("window.__totalDuration || 5"))
        total_frames = int(math.ceil(total_duration * fps))
        print(f"[Pro Render] Rendering {total_frames} frames ({total_duration:.2f}s total duration)...")
        
        for frame_idx in range(total_frames):
            time_sec = frame_idx / fps
            page.evaluate(f"""
                const t = {time_sec};
                if (typeof window.__render === 'function') {{
                    window.__render(t);
                }} else if (typeof window.__renderTime === 'function') {{
                    window.__renderTime(t);
                }}
            """)
            
            frame_path = frames_dir / f"frame_{frame_idx:05d}.jpg"
            page.screenshot(path=str(frame_path), type="jpeg", quality=95)
            
            if (frame_idx + 1) % 30 == 0 or frame_idx == total_frames - 1:
                pct = int(((frame_idx + 1) / total_frames) * 100)
                print(f"[Pro Render] Progress: {pct}% ({frame_idx + 1}/{total_frames} frames)")
                
        browser.close()
        
    return frames_dir

def encode_final_video(frames_dir: Path, audio_file: Path, output_file: Path, fps: int, crf: int):
    """Combines rendered JPEG frames and mixed audio into a production-grade MP4."""
    print(f"[Pro Render] Encoding final MP4 with FFmpeg (CRF {crf})...")
    
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", str(frames_dir / "frame_%05d.jpg"),
        "-i", str(audio_file),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", str(crf),
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(output_file)
    ]
    
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[Pro Render] FFmpeg error: {res.stderr}", file=sys.stderr)
        raise RuntimeError("FFmpeg encoding failed")
        
    print(f"[Pro Render] Successfully produced output video: {output_file}")

def main():
    args = parse_args()
    job_path = Path(args.job)
    if not job_path.exists():
        print(f"Error: Job file does not exist: {job_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(job_path, "r", encoding="utf-8") as f:
        job_data = json.load(f)
        
    job_id = job_path.stem
    workdir = Path(args.workdir)
    job_dir = workdir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    
    aspect_ratio = job_data.get("aspectRatio", "16:9")
    resolution = job_data.get("resolution", "1080p")
    default_w, default_h = get_dimensions(aspect_ratio, resolution)
    width = int(job_data.get("width") or default_w)
    height = int(job_data.get("height") or default_h)
    fps = int(job_data.get("fps") or args.fps)
    job_duration = float(job_data["duration"]) if job_data.get("duration") is not None else None
    
    print(f"[Pro Render] Job ID: {job_id}")
    print(f"[Pro Render] Target Canvas: {width}x{height} ({aspect_ratio}), {fps} FPS")
    print(f"[Pro Render] Scene Count: {len(job_data.get('scenes', []))}")
    
    # 1. Generate or load HTML animation canvas
    if job_data.get("scenesHtml"):
        html_content = job_data["scenesHtml"]
        print("[Pro Render] Loaded custom standalone scenesHtml from job payload")
    else:
        html_content = generate_render_html(job_data, width, height, fps)
        print("[Pro Render] Generated HTML animation canvas from scenes array")
    html_file = job_dir / "render_stage.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    # 2. Extract & stitch audio tracks
    audio_file = extract_audio_tracks(job_data, job_dir)
    
    # 3. Capture frames using Playwright
    frames_dir = render_with_playwright(html_file, job_dir, width, height, fps, job_duration)
    
    # 4. Final MP4 encoding
    output_mp4 = job_dir / "output.mp4"
    encode_final_video(frames_dir, audio_file, output_mp4, fps=fps, crf=args.crf)
    
    print(f"[Pro Render] Done! Final output at: {output_mp4}")

if __name__ == "__main__":
    main()
