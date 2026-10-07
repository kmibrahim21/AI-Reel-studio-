import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to get active Gemini API key (from header, request body, or server env)
function getGeminiKey(req: Request): string {
  const customKey = (req.headers['x-gemini-key'] as string) || req.body?.customApiKey || req.query?.key as string;
  return (customKey && customKey.trim().length > 0) ? customKey.trim() : (process.env.GEMINI_API_KEY || '').trim();
}

function getGenAIClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint for Gemini API key (GET)
app.get('/api/health-check', (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  return res.json({
    ok: hasKey,
    hasServerKey: hasKey,
    statusCategory: hasKey ? 'valid' : 'missing_key',
    banglaReason: hasKey ? '✓ যুক্ত' : '⚠️ কোনো কী দেওয়া হয়নি',
    message: hasKey ? 'Server GEMINI_API_KEY is configured' : 'Server GEMINI_API_KEY is not set'
  });
});

// Health check endpoint for Gemini API key (POST)
app.post('/api/health-check', async (req: Request, res: Response) => {
  const apiKey = getGeminiKey(req);
  if (!apiKey) {
    return res.status(400).json({
      ok: false,
      code: 400,
      statusCategory: 'invalid_key',
      banglaReason: '❌ কোনো API কী দেওয়া হয়নি',
      detailedHelp: '⚠️ কোনো Gemini API key পাওয়া যায়নি।',
      message: 'No API key provided or found in environment'
    });
  }

  try {
    const ai = getGenAIClient(apiKey);
    await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'hi',
    });

    return res.json({
      ok: true,
      code: 200,
      statusCategory: 'valid',
      banglaReason: '✓ যুক্ত',
      message: '✓ যুক্ত (সক্রিয় ও কার্যকরী)'
    });
  } catch (err: any) {
    const status = err.status || 500;
    const isQuota = status === 429 || (err.message && err.message.includes('429'));
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      code: status,
      statusCategory: isQuota ? 'quota_exceeded' : 'invalid_key',
      banglaReason: isQuota ? '⚠️ কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো' : '❌ অবৈধ key',
      detailedHelp: isQuota ? '⚠️ কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো' : '⚠️ এই key-টি কাজ করছে না।',
      error: err.message || `Error ${status}`
    });
  }
});

// AI Script Generation endpoint
app.post('/api/gemini/script', async (req: Request, res: Response) => {
  const apiKey = getGeminiKey(req);
  const { topic } = req.body;

  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      code: 401,
      banglaReason: '⚠️ AI key পাওয়া যায়নি',
      message: 'Missing or invalid Gemini API key'
    });
  }

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({
      ok: false,
      code: 400,
      banglaReason: 'অনুগ্রহ করে একটি বিষয় বা টপিক লিখুন',
      message: 'Topic is required'
    });
  }

  const systemInstruction = `You are ReelStudio, an elite Bengali video script creator for viral social media reels and explainer videos.
Generate a structured video script strictly in the ZBot format.
IMPORTANT FIDELITY RULES:
1. Write exclusively in authentic, natural Bengali (বাংলা).
2. DO NOT fabricate false factual claims or invented statistics (e.g. do NOT invent "৮০% কমবে", "৫০ হাজার ইউজার", "৯৯% সফল" unless explicitly stated in topic).
3. Structure format MUST follow EXACTLY this syntax:
TITLE: <আকর্ষণীয় বাংলা শিরোনাম>

## SCENE 1
NARRATION: <প্রথম দৃশ্যের ভয়েসওভার বাক্য (সাধারণ, তথ্যবহুল ও আকর্ষণীয়)>
IMAGE: <ভিজ্যুয়াল বর্ণনা ও সাজেশন>

## SCENE 2
NARRATION: <দ্বিতীয় দৃশ্যের ভয়েসওভার বাক্য>
IMAGE: <ভিজ্যুয়াল বর্ণনা>

## SCENE 3
NARRATION: <পরবর্তী দৃশ্যের ভয়েসওভার বাক্য>
IMAGE: <ভিজ্যুয়াল বর্ণনা>

(Generate between 4 to 6 concise scenes appropriate for a 30-60 second reel).`;

  const prompt = `টপিক: ${topic.trim()}\n\nএই বিষয়ের উপর একটি ৪ থেকে ৬ দৃশ্যের আকর্ষণীয় বাংলা রিল স্ক্রিপ্ট তৈরি করো।`;

  try {
    const ai = getGenAIClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const generatedText = response.text;
    if (generatedText) {
      return res.json({
        ok: true,
        script: generatedText
      });
    }

    throw new Error('No script generated');
  } catch (err: any) {
    const status = err.status || 500;
    let banglaReason = '⚠️ AI স্ক্রিপ্ট তৈরিতে সমস্যা হয়েছে';
    if (status === 404) banglaReason = '⚠️ মডেল পাওয়া যায়নি';
    else if (status === 429) banglaReason = '⚠️ AI কোটা শেষ — কিছুক্ষণ পর চেষ্টা করো';
    else if (status === 403 || status === 401) banglaReason = '⚠️ key-র অনুমতি নেই';

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      code: status,
      banglaReason,
      error: err.message || 'Failed to generate script'
    });
  }
});

// Helper to convert raw 16-bit Mono 24kHz PCM to valid WAV with 44-byte RIFF header
function convertPcmToWav(base64Data: string, sampleRate = 24000): string {
  try {
    const rawBuffer = Buffer.from(base64Data, 'base64');
    // If it already starts with 'RIFF', it is already a valid WAV
    if (rawBuffer.length >= 12 && rawBuffer.toString('ascii', 0, 4) === 'RIFF') {
      return base64Data;
    }

    const numChannels = 1; // mono
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = rawBuffer.length;
    const chunkSize = 36 + dataSize;

    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(chunkSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
    wavHeader.writeUInt16LE(1, 20);  // AudioFormat (PCM = 1)
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(blockAlign, 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);

    const fullWavBuffer = Buffer.concat([wavHeader, rawBuffer]);
    return fullWavBuffer.toString('base64');
  } catch (err) {
    console.warn('convertPcmToWav fallback error', err);
    return base64Data;
  }
}

// Gemini TTS Endpoint
// Priority order: gemini-2.5-flash-preview-tts -> gemini-2.5-pro-preview-tts -> gemini-2.5-flash
app.post('/api/tts/gemini', async (req: Request, res: Response) => {
  const apiKey = getGeminiKey(req);
  const { text, voiceName = 'Kore' } = req.body;

  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      code: 401,
      banglaReason: 'API কী (Key) পাওয়া যায়নি',
      message: 'API Key missing'
    });
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({
      ok: false,
      code: 400,
      banglaReason: 'উচ্চারণ করার জন্য কোনো টেক্সট নেই',
      message: 'Text is required'
    });
  }

  // Clean Bengali text only in user turn; English instructions in systemInstruction
  const cleanSpokenText = text.replace(/##\s*SCENE\s*\d+/gi, '')
                              .replace(/NARRATION:/gi, '')
                              .replace(/IMAGE:.*$/gim, '')
                              .trim();

  const modelsOrder = [
    'gemini-3.8-flash-lite-tts',
    'gemini-3.8-flash-tts'
  ];

  // Map requested voice or default to Kore
  const validVoices = ['Kore', 'Aoede', 'Charon', 'Fenrir', 'Puck'];
  const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

  let successAudio: { base64: string; mimeType: string; model: string } | null = null;
  let lastStatus = 500;
  let lastErrMsg = '';

  const ai = getGenAIClient(apiKey);

  for (const model of modelsOrder) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanSpokenText }]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice
              }
            }
          }
        }
      });

      const cand = response.candidates?.[0]?.content?.parts?.[0];
      if (cand?.inlineData?.data) {
        // Convert raw PCM to standard WAV with RIFF header if needed
        const convertedBase64 = convertPcmToWav(cand.inlineData.data, 24000);
        successAudio = {
          base64: convertedBase64,
          mimeType: 'audio/wav',
          model
        };
        break;
      }
    } catch (err: any) {
      lastStatus = err.status || 500;
      lastErrMsg = err.message || `Error calling ${model}`;
    }
  }

  if (successAudio) {
    return res.json({
      ok: true,
      audioBase64: successAudio.base64,
      mimeType: successAudio.mimeType,
      model: successAudio.model,
      voiceName: selectedVoice
    });
  }

  let banglaReason = 'অনুরোধে সমস্যা';
  if (lastStatus === 404) banglaReason = 'মডেল পাওয়া যায়নি';
  else if (lastStatus === 429) banglaReason = 'কোটা শেষ';
  else if (lastStatus === 401 || lastStatus === 403) banglaReason = 'key-র অনুমতি নেই';
  else if (lastStatus === 400) banglaReason = 'অনুরোধে সমস্যা';

  return res.status(lastStatus >= 400 && lastStatus < 600 ? lastStatus : 500).json({
    ok: false,
    code: lastStatus,
    banglaReason,
    error: lastErrMsg || 'All TTS models failed'
  });
});

// ElevenLabs TTS Proxy
app.post('/api/tts/elevenlabs', async (req: Request, res: Response) => {
  const { text, apiKey, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;
  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      code: 401,
      banglaReason: 'ElevenLabs API কী প্রয়োজন',
      message: 'ElevenLabs key required'
    });
  }

  try {
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey.trim()
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      let banglaReason = 'অনুরোধে সমস্যা';
      if (resp.status === 401 || resp.status === 403) banglaReason = 'key-র অনুমতি নেই';
      else if (resp.status === 429) banglaReason = 'কোটা শেষ';
      return res.status(resp.status).json({
        ok: false,
        code: resp.status,
        banglaReason,
        error: errText
      });
    }

    const arrayBuffer = await resp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return res.json({
      ok: true,
      audioBase64: base64,
      mimeType: 'audio/mpeg',
      model: 'eleven_multilingual_v2'
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      code: 500,
      banglaReason: 'অনুরোধে সমস্যা',
      error: err.message
    });
  }
});

// Setup Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReelStudio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
