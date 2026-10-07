import { ProjectData, HistoryItem, AppSettings } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'reelstudio_projects_v4',
  ACTIVE_PROJECT: 'reelstudio_active_project_id_v4',
  HISTORY: 'reelstudio_history_v4',
  SETTINGS: 'reelstudio_settings_v4',
  GEMINI_KEY: 'reelstudio_gemini_key',
  GITHUB_PAT: 'reelstudio_github_pat',
  GITHUB_REPO: 'reelstudio_github_repo',
};

export function getStoredGeminiKey(): string {
  try {
    return (localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setStoredGeminiKey(key: string): void {
  try {
    const trimmed = (key || '').trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    }
  } catch (e) {
    console.error('Failed to set stored gemini key', e);
  }
}

export function getStoredGitHubPat(): string {
  try {
    return (localStorage.getItem(STORAGE_KEYS.GITHUB_PAT) || '').trim();
  } catch {
    return '';
  }
}

export function setStoredGitHubPat(pat: string): void {
  try {
    const trimmed = (pat || '').trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEYS.GITHUB_PAT, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GITHUB_PAT);
    }
  } catch (e) {
    console.error('Failed to set stored github pat', e);
  }
}

export function getStoredGitHubRepo(): string {
  try {
    return (localStorage.getItem(STORAGE_KEYS.GITHUB_REPO) || 'kmibrahim21/ReelStudio').trim();
  } catch {
    return 'kmibrahim21/ReelStudio';
  }
}

export function setStoredGitHubRepo(repo: string): void {
  try {
    const trimmed = (repo || '').trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, trimmed);
    } else {
      localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, 'kmibrahim21/ReelStudio');
    }
  } catch (e) {
    console.error('Failed to set stored github repo', e);
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  elevenLabsApiKey: '',
  defaultVoice: 'Kore',
  defaultTemplate: 'dark_neon',
  defaultEngine: 'gemini',
  githubPat: '',
  githubRepo: 'kmibrahim21/ReelStudio',
};

export const INITIAL_SCRIPT_TEMPLATE = `TITLE: ফ্রিল্যান্সিংয়ে কীভাবে দ্রুত কাজ পাবেন?

## SCENE 1
NARRATION: সফল ফ্রিল্যান্সার হতে চাইলে শুরুতেই একটি নির্দিষ্ট দক্ষতায় গভীর মনোযোগ দিন।
IMAGE: একজন দক্ষ ফ্রিল্যান্সার ল্যাপটপে গভীর মনোযোগ দিয়ে কাজ করছেন

## SCENE 2
NARRATION: ক্লায়েন্টদের সাধারণ রেজ্যুমির চেয়ে বাস্তব কাজের পোর্টফোলিও বেশি আকৃষ্ট করে।
IMAGE: দৃষ্টিনন্দন ডিজাইন এবং কোডিং প্রজেক্টের লাইভ পোর্টফোলিও শোকেস

## SCENE 3
NARRATION: প্রতিদিন নতুন কাজের প্রস্তাবে সময় দিন এবং স্পষ্ট ও সংক্ষিপ্ত বার্তা পাঠান।
IMAGE: সময়নিষ্ঠভাবে ক্লায়েন্টদের সাথে চ্যাটিং ও প্রপোজাল সাবমিশন স্ক্রিন

## SCENE 4
NARRATION: কাজের গুণমান ধরে রাখুন এবং ক্লায়েন্টের আস্থা অর্জন করে দীর্ঘমেয়াদী সম্পর্ক গড়ুন।
IMAGE: সফল প্রজেক্ট সমাপ্তি এবং সন্তুষ্ট ক্লায়েন্টের ৫-স্টার রিভিউ রেটিং

## SCENE 5
NARRATION: আজই আপনার স্কিল নির্ধারণ করুন এবং আত্মবিশ্বাসের সাথে ক্যারিয়ার শুরু করুন।
IMAGE: মোটিভেশনাল কল টু অ্যাকশন এবং প্রফেশনাল গ্রোথ গ্রাফ`;

export function getSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const storedKey = getStoredGeminiKey();
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        geminiApiKey: storedKey || parsed.geminiApiKey || ''
      };
    }
    if (storedKey) {
      return { ...DEFAULT_SETTINGS, geminiApiKey: storedKey };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    if (settings.geminiApiKey) {
      setStoredGeminiKey(settings.geminiApiKey);
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getSavedProjects(): ProjectData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load projects', e);
  }
  return [];
}

export function saveProjects(projects: ProjectData[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects', e);
  }
}

export function getRenderHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load history', e);
  }
  return [];
}

export function addHistoryItem(item: HistoryItem): void {
  try {
    const history = getRenderHistory();
    // Keep max 20 history items to save localStorage space
    const updated = [item, ...history].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to add history item', e);
  }
}

export function clearRenderHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}
