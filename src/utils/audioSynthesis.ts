import { VoiceName, TTSEngine } from '../types';
import { getStoredGeminiKey } from './storage';

let audioCtxInstance: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtxInstance) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxInstance = new AudioCtx();
  }
  if (audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume();
  }
  return audioCtxInstance;
}

// Convert AudioBuffer to 16-bit Mono/Stereo WAV ArrayBuffer
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  out.setUint32(pos, 0x46464952, true); pos += 4; // "RIFF"
  setUint32(length - 8);
  out.setUint32(pos, 0x45564157, true); pos += 4; // "WAVE"
  // fmt sub-chunk
  out.setUint32(pos, 0x20746d66, true); pos += 4; // "fmt "
  setUint32(16); // subchunk1size
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample
  // data sub-chunk
  out.setUint32(pos, 0x61746164, true); pos += 4; // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return out.buffer;
}

// Decode base64 WAV or audio to AudioBuffer cleanly
export async function decodeBase64AudioToBuffer(base64Data: string): Promise<AudioBuffer | null> {
  try {
    const ctx = getAudioContext();
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return await ctx.decodeAudioData(bytes.buffer.slice(0));
  } catch (err) {
    console.warn('decodeBase64AudioToBuffer failed', err);
    return null;
  }
}

// Sound Design: Procedural cinematic transition whoosh sound effect (WebAudio)
export function generateProceduralWhooshSound(durationSec: number = 0.4): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Filtered stereo noise sweep
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const env = Math.sin(t * Math.PI) * Math.sin(t * Math.PI);
    const whiteNoise = (Math.random() * 2 - 1);
    const softSweep = Math.sin(2 * Math.PI * (160 + t * 500) * (i / sampleRate));
    const val = (whiteNoise * 0.45 + softSweep * 0.55) * env * 0.2;
    
    left[i] = val * (1 - t * 0.35);
    right[i] = val * (0.65 + t * 0.35);
  }
  return buffer;
}

// Procedural Card/Element Entrance soft pop sound (0.15s)
export function generateProceduralPopSound(durationSec: number = 0.15): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const env = Math.exp(-t * 22); // Fast exponential decay
    const freq = 650 - t * 350; // Pitch slide downwards
    const tone = Math.sin(2 * Math.PI * freq * (i / sampleRate));
    const val = tone * env * 0.18;
    left[i] = val;
    right[i] = val;
  }
  return buffer;
}

// Procedural Count-Up tick sound (0.08s)
export function generateProceduralTickSound(durationSec: number = 0.08): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const env = Math.exp(-t * 40);
    const click = Math.sin(2 * Math.PI * 1800 * (i / sampleRate));
    const val = click * env * 0.12;
    left[i] = val;
    right[i] = val;
  }
  return buffer;
}

// Procedural CTA harmonic bell chime sound (0.6s)
export function generateProceduralChimeSound(durationSec: number = 0.6): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Multi-harmonic bell shimmer (C6, E6, G6, B6)
  const freqs = [1046.5, 1318.5, 1567.98, 1975.53];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const env = Math.exp(-t * 7);
    let chimeSignal = 0;
    freqs.forEach((f, idx) => {
      chimeSignal += Math.sin(2 * Math.PI * f * (i / sampleRate)) * (1 / (idx + 1));
    });
    const val = chimeSignal * env * 0.14;
    left[i] = val * (0.8 + 0.2 * Math.sin(t * 10));
    right[i] = val * (0.8 + 0.2 * Math.cos(t * 10));
  }
  return buffer;
}

// Instant SFX playback in browser
export function playSfx(type: 'whoosh' | 'pop' | 'tick' | 'chime', volume: number = 0.25): void {
  try {
    const ctx = getAudioContext();
    let buf: AudioBuffer;
    if (type === 'whoosh') buf = generateProceduralWhooshSound(0.4);
    else if (type === 'pop') buf = generateProceduralPopSound(0.15);
    else if (type === 'tick') buf = generateProceduralTickSound(0.08);
    else buf = generateProceduralChimeSound(0.6);

    const source = ctx.createBufferSource();
    source.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) {
    // AudioContext autoplay fallback
  }
}

// Synthesize procedural background music loops (Calm Corporate, Upbeat, Soft Piano)
export function generateProceduralBgMusic(trackName: string, durationSec: number = 30): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  let bpm = 90;
  let baseFreq = 130.81; // C3
  let chordProgression: number[][];

  if (trackName === 'upbeat') {
    bpm = 118;
    baseFreq = 146.83; // D3
    chordProgression = [
      [baseFreq, baseFreq * 1.25, baseFreq * 1.5],         // I
      [baseFreq * 1.5, baseFreq * 1.87, baseFreq * 2.25],   // V
      [baseFreq * 1.12, baseFreq * 1.4, baseFreq * 1.68],   // vi
      [baseFreq * 1.33, baseFreq * 1.66, baseFreq * 2]      // IV
    ];
  } else if (trackName === 'piano' || trackName === 'lofi') {
    // Soft Piano
    bpm = 72;
    baseFreq = 110.0; // A2
    chordProgression = [
      [baseFreq, baseFreq * 1.2, baseFreq * 1.5],          // Am
      [baseFreq * 1.33, baseFreq * 1.66, baseFreq * 2],    // Dm
      [baseFreq * 1.5, baseFreq * 1.87, baseFreq * 2.25],  // Em
      [baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.87]   // F
    ];
  } else {
    // Calm Corporate (Default)
    bpm = 95;
    baseFreq = 130.81; // C3
    chordProgression = [
      [baseFreq, baseFreq * 1.25, baseFreq * 1.5],
      [baseFreq * 1.33, baseFreq * 1.66, baseFreq * 2],
      [baseFreq * 1.5, baseFreq * 1.87, baseFreq * 2.25],
      [baseFreq * 1.12, baseFreq * 1.4, baseFreq * 1.68]
    ];
  }

  const beatSec = 60 / bpm;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor(t / (beatSec * 4)) % chordProgression.length;
    const currentChord = chordProgression[chordIndex];

    let chordSignal = 0;
    for (const freq of currentChord) {
      chordSignal += Math.sin(2 * Math.PI * freq * t) * 0.08;
    }

    // Soft beat pulse
    const beatPhase = (t % beatSec) / beatSec;
    const kick = Math.exp(-beatPhase * 16) * Math.sin(2 * Math.PI * 55 * beatPhase) * 0.1;
    const snare = beatPhase > 0.48 && beatPhase < 0.54 ? (Math.random() * 2 - 1) * 0.03 : 0;

    const val = (chordSignal + kick + snare) * 0.35;
    left[i] = val;
    right[i] = val * 0.95;
  }

  return buffer;
}

// Calculate approximate speaking duration in seconds for Bengali text (roughly ~2.8 to 3.2 syllables per sec)
export function estimateBengaliSpeechDuration(text: string): number {
  if (!text) return 3;
  const words = text.trim().split(/\s+/).length;
  // Average reading speed: ~2.2 words per second in Bengali explainer reels + padding
  const estSeconds = Math.max(3.0, (words / 2.2) + 0.8);
  return Math.min(25, parseFloat(estSeconds.toFixed(1)));
}

// Request Gemini TTS from server
export async function requestGeminiTTS(
  text: string,
  voiceName: VoiceName,
  customApiKey?: string
): Promise<{
  audioUrl: string;
  duration: number;
  model: string;
  voiceName: string;
}> {
  const activeKey = (customApiKey || getStoredGeminiKey() || '').trim();

  const res = await fetch('/api/tts/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(activeKey ? { 'x-gemini-key': activeKey } : {})
    },
    body: JSON.stringify({
      text,
      voiceName,
      customApiKey: activeKey
    })
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const err: any = new Error('সার্ভার থেকে অবৈধ রেসপন্স এসেছে');
    err.status = res.status;
    err.banglaReason = 'সার্ভার সংযোগ সমস্যা';
    throw err;
  }

  const data = await res.json();
  if (!res.ok || !data.ok) {
    const err: any = new Error(data.banglaReason || 'TTS ত্রুটি');
    err.status = data.code || res.status;
    err.banglaReason = data.banglaReason || 'অনুরোধে সমস্যা';
    throw err;
  }

  const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
  
  // Calculate duration by decoding audio or estimate
  let duration = estimateBengaliSpeechDuration(text);
  try {
    const ctx = getAudioContext();
    const binary = atob(data.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const decoded = await ctx.decodeAudioData(bytes.buffer);
    if (decoded && decoded.duration > 0) {
      duration = decoded.duration;
    }
  } catch (e) {
    console.warn('Audio duration decode fallback', e);
  }

  return {
    audioUrl,
    duration,
    model: data.model || 'gemini-3.8-flash-lite-tts',
    voiceName: data.voiceName || voiceName
  };
}

// Request ElevenLabs TTS from server
export async function requestElevenLabsTTS(
  text: string,
  apiKey: string
): Promise<{ audioUrl: string; duration: number; model: string }> {
  const res = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, apiKey })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    const err: any = new Error(data.banglaReason || 'ElevenLabs ত্রুটি');
    err.status = data.code || res.status;
    err.banglaReason = data.banglaReason || 'অনুরোধে সমস্যা';
    throw err;
  }

  const audioUrl = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`;
  const duration = estimateBengaliSpeechDuration(text);
  return { audioUrl, duration, model: 'eleven_multilingual_v2' };
}

// Test voice playback in browser
let activePreviewAudio: HTMLAudioElement | null = null;

export function stopVoicePreview(): void {
  if (activePreviewAudio) {
    activePreviewAudio.pause();
    activePreviewAudio.currentTime = 0;
    activePreviewAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playAudioUrl(url: string): Promise<void> {
  stopVoicePreview();
  const audio = new Audio(url);
  activePreviewAudio = audio;
  await audio.play();
}

// Play browser Bengali speech
export function speakBrowserSpeech(text: string, onEnd?: () => void): void {
  stopVoicePreview();
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'bn-BD';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  
  const voices = window.speechSynthesis.getVoices();
  const bnVoice = voices.find(v => v.lang.includes('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali'));
  if (bnVoice) {
    utterance.voice = bnVoice;
  }
  
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}
