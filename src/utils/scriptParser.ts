import { Scene, ComponentVisualType } from '../types';

export interface ParseResult {
  title: string;
  scenes: Scene[];
}

export interface CoverageResult {
  totalSentences: number;
  coveredSentences: number;
  coveragePercentage: number;
  uncoveredList: string[];
}

// Split Bengali text into clean sentences (using Dari '।' or newline or punctuation)
export function extractScriptSentences(rawText: string): string[] {
  // Remove metadata labels
  const cleaned = rawText
    .replace(/^TITLE:.*$/gim, '')
    .replace(/^##\s*SCENE\s*\d+.*$/gim, '')
    .replace(/^IMAGE:.*$/gim, '')
    .replace(/^NARRATION:\s*/gim, '')
    .trim();

  // Split by Dari '।' or exclamation '!' or question '?' or full-stop '.'
  const rawParts = cleaned.split(/[।!?\n]+/);
  return rawParts
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

// Parse ZBot format text or plain Bengali script into Scenes
export function parseScriptToScenes(rawText: string): ParseResult {
  let title = 'আমার বাংলা ভিডিও';
  const titleMatch = rawText.match(/^TITLE:\s*(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Check if standard ZBot ## SCENE blocks exist
  const sceneRegex = /##\s*SCENE\s*(\d+)([\s\S]*?)(?=(?:##\s*SCENE\s*\d+|$))/gi;
  const matches = [...rawText.matchAll(sceneRegex)];

  if (matches.length > 0) {
    const scenes: Scene[] = matches.map((match, idx) => {
      const sceneNum = parseInt(match[1], 10) || (idx + 1);
      const sceneContent = match[2];

      const narrationMatch = sceneContent.match(/NARRATION:\s*([\s\S]*?)(?=(?:IMAGE:|$))/i);
      const imageMatch = sceneContent.match(/IMAGE:\s*([\s\S]*?)$/i);

      const narration = narrationMatch ? narrationMatch[1].trim() : '';
      const imageDesc = imageMatch ? imageMatch[1].trim() : 'ভিজ্যুয়াল সিনারিও';

      // Derive headline and caption strictly from user's narration
      const sentences = narration.split(/[।!?\n]+/).map(s => s.trim()).filter(Boolean);
      const headline = sentences[0] || `দৃশ্য ${sceneNum}`;
      const caption = sentences.length > 1 ? sentences.slice(1).join('। ') + '।' : narration;

      const compType = detectComponentType(narration, sceneNum, matches.length);

      return {
        id: `scene_${Date.now()}_${idx}`,
        sceneNumber: sceneNum,
        headline,
        caption: caption || narration,
        voiceover_text: narration,
        visualDescription: imageDesc,
        component: compType,
        voiceStatus: 'pending',
      };
    });

    return { title, scenes };
  }

  // Fallback: If no "## SCENE" markers, smartly split raw script into 4-6 scenes
  const sentences = extractScriptSentences(rawText);
  if (sentences.length === 0) {
    return {
      title,
      scenes: [
        {
          id: `scene_${Date.now()}_0`,
          sceneNumber: 1,
          headline: 'দৃশ্য ১',
          caption: 'আপনার স্ক্রিপ্ট লিখুন বা পেস্ট করুন।',
          voiceover_text: 'আপনার স্ক্রিপ্ট লিখুন বা পেস্ট করুন।',
          visualDescription: 'ইন্ট্রো দৃশ্য',
          component: 'visual_card',
          voiceStatus: 'pending',
        }
      ]
    };
  }

  // Group sentences into 3 to 6 scenes
  const targetSceneCount = Math.min(Math.max(3, Math.ceil(sentences.length / 2)), 6);
  const chunkSize = Math.ceil(sentences.length / targetSceneCount);
  const scenes: Scene[] = [];

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize);
    const sceneNum = scenes.length + 1;
    const narration = chunk.join('। ') + (chunk[chunk.length - 1].endsWith('।') ? '' : '।');
    const headline = chunk[0];
    const caption = chunk.length > 1 ? chunk.slice(1).join('। ') + '।' : chunk[0];
    const compType = detectComponentType(narration, sceneNum, targetSceneCount);

    scenes.push({
      id: `scene_${Date.now()}_${sceneNum}`,
      sceneNumber: sceneNum,
      headline,
      caption,
      voiceover_text: narration,
      visualDescription: `দৃশ্য ${sceneNum}-এর ভিজ্যুয়াল ব্যাকগ্রাউন্ড`,
      component: compType,
      voiceStatus: 'pending',
    });
  }

  return { title, scenes };
}

// Strictly detect component without fabricating any data
function detectComponentType(text: string, index: number, total: number): ComponentVisualType {
  // If last scene and has call to action keywords
  if (index === total || /এখনই|সাবস্ক্রাইব|ফলো|যোগাযোগ|দেখুন|লাইক/i.test(text)) {
    return 'cta_pill';
  }
  // If contains real numbers or percentage symbols in script
  if (/[০-৯0-9]|%|শতাংশ/i.test(text)) {
    return 'stat_big';
  }
  // If contains list or points keywords
  if (/যেমন|প্রথমত|দ্বিতীয়ত|ধাপ|তালিকা/i.test(text)) {
    return 'feature_list';
  }
  // If contains comparison or pricing keywords
  if (/বনাম|তুলনা|দাম|খরচ|টাকা|মূল্য/i.test(text)) {
    return 'price_duel';
  }
  // If contains messaging or chat keywords
  if (/মেসেজ|বার্তা|কথোপকথন|চ্যাট/i.test(text)) {
    return 'chat_mock';
  }
  // If contains website or link keywords
  if (/ওয়েবসাইট|লিংক|ব্রাউজার|অ্যাপ|ওয়েব/i.test(text)) {
    return 'browser_mock';
  }
  return 'visual_card';
}

// Validate sentence coverage fidelity
export function validateScriptCoverage(rawScript: string, scenes: Scene[]): CoverageResult {
  const originalSentences = extractScriptSentences(rawScript);
  if (originalSentences.length === 0) {
    return {
      totalSentences: 0,
      coveredSentences: 0,
      coveragePercentage: 100,
      uncoveredList: []
    };
  }

  const allSceneNarration = scenes.map(s => s.voiceover_text).join(' ');

  const uncoveredList: string[] = [];
  let coveredCount = 0;

  for (const sentence of originalSentences) {
    // Check if substantial words from the sentence are present in the scenes
    const normalizedSentence = sentence.replace(/[।!?.,]/g, '').trim();
    if (normalizedSentence.length < 3) continue;

    // Check inclusion
    if (allSceneNarration.includes(normalizedSentence) || allSceneNarration.includes(sentence)) {
      coveredCount++;
    } else {
      // Check partial match (if > 70% of words exist)
      const words = normalizedSentence.split(/\s+/).filter(w => w.length > 1);
      const matchedWords = words.filter(w => allSceneNarration.includes(w));
      if (words.length > 0 && (matchedWords.length / words.length) >= 0.7) {
        coveredCount++;
      } else {
        uncoveredList.push(sentence);
      }
    }
  }

  const percentage = Math.round((coveredCount / originalSentences.length) * 100);

  return {
    totalSentences: originalSentences.length,
    coveredSentences: coveredCount,
    coveragePercentage: Math.min(100, percentage),
    uncoveredList
  };
}
