import React, { useState, useEffect, useCallback } from 'react';
import {
  WizardStep,
  AppMode,
  AppTab,
  AspectRatioType,
  ResolutionType,
  VisualType,
  TemplateType,
  SubtitleConfig,
  MotionConfig,
  VoiceConfig,
  ProjectData,
  HistoryItem,
  AppSettings,
  Scene
} from './types';
import {
  getSavedSettings,
  saveSettings,
  getSavedProjects,
  saveProjects,
  getRenderHistory,
  addHistoryItem,
  clearRenderHistory,
  INITIAL_SCRIPT_TEMPLATE
} from './utils/storage';
import { parseScriptToScenes } from './utils/scriptParser';
import { Header } from './components/Header';
import { ModeCardsRow } from './components/ModeCardsRow';
import { WizardPills } from './components/WizardPills';
import { Step1Script } from './components/Step1Script';
import { Step2Format } from './components/Step2Format';
import { Step3Subtitles } from './components/Step3Subtitles';
import { Step4Motion } from './components/Step4Motion';
import { Step5Voice } from './components/Step5Voice';
import { VideoPreviewAndRender } from './components/VideoPreviewAndRender';
import { ProjectsTab } from './components/ProjectsTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { FacebookPublishModal } from './components/FacebookPublishModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>('studio');
  const [currentMode, setCurrentMode] = useState<AppMode>('full_video');
  const [currentStep, setCurrentStep] = useState<WizardStep>('script');

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(getSavedSettings);

  // Projects & History
  const [projects, setProjects] = useState<ProjectData[]>(getSavedProjects);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(getRenderHistory);
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    return `proj_${Date.now()}`;
  });

  // Current Project State
  const [projectTitle, setProjectTitle] = useState<string>('ফ্রিল্যান্সিংয়ে কীভাবে দ্রুত কাজ পাবেন?');
  const [rawScript, setRawScript] = useState<string>(INITIAL_SCRIPT_TEMPLATE);
  const [scenes, setScenes] = useState<Scene[]>(() => {
    return parseScriptToScenes(INITIAL_SCRIPT_TEMPLATE).scenes;
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [resolution, setResolution] = useState<ResolutionType>('1080p');
  const [visualType, setVisualType] = useState<VisualType>('images');
  const [template, setTemplate] = useState<TemplateType>(settings.defaultTemplate || 'dark_neon');

  const [subtitles, setSubtitles] = useState<SubtitleConfig>({
    enabled: true,
    animation: 'word_by_word',
    font: 'Hind Siliguri',
    size: 'medium',
    position: 'bottom',
    textColor: '#FFFFFF',
    highlightColor: '#F59E0B',
    outlineColor: '#000000',
  });

  const [motion, setMotion] = useState<MotionConfig>({
    kenBurnsEnabled: true,
    cameraMotion: 'slow_zoom',
    transition: 'fade_violet',
  });

  const [voice, setVoice] = useState<VoiceConfig>({
    engine: settings.defaultEngine || 'gemini',
    voiceName: settings.defaultVoice || 'Kore',
    bgMusicTrack: 'lofi',
    bgMusicVolume: 0.15,
  });

  const [completedSteps, setCompletedSteps] = useState<Record<WizardStep, boolean>>({
    script: true,
    format: false,
    subtitles: false,
    motion: false,
    voice: false,
  });

  // Modals & Save State
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [lastRenderedBlob, setLastRenderedBlob] = useState<Blob | null>(null);
  const [lastRenderedFilename, setLastRenderedFilename] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Update completed steps tracker
  useEffect(() => {
    setCompletedSteps({
      script: scenes.length > 0 && !!rawScript.trim(),
      format: !!aspectRatio && !!template,
      subtitles: true,
      motion: true,
      voice: scenes.some(s => s.voiceStatus === 'ready' || s.voiceStatus === 'fallback'),
    });
  }, [scenes, rawScript, aspectRatio, template]);

  // Adjust current step if mode is Audio Only
  const handleModeSelect = (mode: AppMode) => {
    setCurrentMode(mode);
    if (mode === 'audio_only') {
      if (currentStep !== 'script' && currentStep !== 'voice') {
        setCurrentStep('script');
      }
    } else if (mode === 'images_only') {
      setVisualType('images');
    } else if (mode === 'videos_only') {
      setVisualType('videos');
    } else if (mode === 'ai_script') {
      setCurrentStep('script');
    }
  };

  // Synchronize Gemini API key across app and storage
  const handleUpdateGeminiKey = (newKey: string) => {
    const updatedSettings: AppSettings = { ...settings, geminiApiKey: newKey };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  // Save current project
  const handleSaveCurrentProject = useCallback(() => {
    setIsSaving(true);
    const updatedProj: ProjectData = {
      id: currentProjectId,
      title: projectTitle,
      mode: currentMode,
      rawScript,
      scenes,
      aspectRatio,
      resolution,
      visualType,
      template,
      subtitles,
      motion,
      voice,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const existingIdx = projects.findIndex(p => p.id === currentProjectId);
    let newProjects: ProjectData[];
    if (existingIdx >= 0) {
      newProjects = [...projects];
      newProjects[existingIdx] = updatedProj;
    } else {
      newProjects = [updatedProj, ...projects];
    }

    setProjects(newProjects);
    saveProjects(newProjects);

    setTimeout(() => {
      setIsSaving(false);
    }, 400);
  }, [
    currentProjectId,
    projectTitle,
    currentMode,
    rawScript,
    scenes,
    aspectRatio,
    resolution,
    visualType,
    template,
    subtitles,
    motion,
    voice,
    projects
  ]);

  // Open an existing project
  const handleOpenProject = (proj: ProjectData) => {
    setCurrentProjectId(proj.id);
    setProjectTitle(proj.title);
    setCurrentMode(proj.mode || 'full_video');
    setRawScript(proj.rawScript);
    setScenes(proj.scenes || parseScriptToScenes(proj.rawScript).scenes);
    setAspectRatio(proj.aspectRatio || '9:16');
    setResolution(proj.resolution || '1080p');
    setVisualType(proj.visualType || 'images');
    setTemplate(proj.template || 'dark_neon');
    if (proj.subtitles) setSubtitles(proj.subtitles);
    if (proj.motion) setMotion(proj.motion);
    if (proj.voice) setVoice(proj.voice);
    setActiveTab('studio');
  };

  // Duplicate project
  const handleDuplicateProject = (proj: ProjectData) => {
    const dup: ProjectData = {
      ...proj,
      id: `proj_${Date.now()}`,
      title: `${proj.title} (কপি)`,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [dup, ...projects];
    setProjects(updated);
    saveProjects(updated);
  };

  // Delete project
  const handleDeleteProject = (projId: string) => {
    const updated = projects.filter(p => p.id !== projId);
    setProjects(updated);
    saveProjects(updated);
    if (currentProjectId === projId) {
      handleCreateNewProject();
    }
  };

  // Create new project
  const handleCreateNewProject = () => {
    const newId = `proj_${Date.now()}`;
    setCurrentProjectId(newId);
    setProjectTitle('নতুন বাংলা রিল');
    setRawScript(INITIAL_SCRIPT_TEMPLATE);
    const parsed = parseScriptToScenes(INITIAL_SCRIPT_TEMPLATE);
    setScenes(parsed.scenes);
    setCurrentStep('script');
    setActiveTab('studio');
  };

  // Save Settings handler
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Video Render Completed Handler
  const handleRenderComplete = (videoBlob: Blob, filename: string, duration: number) => {
    setLastRenderedBlob(videoBlob);
    setLastRenderedFilename(filename);

    // Save to History
    const historyItem: HistoryItem = {
      id: `hist_${Date.now()}`,
      projectName: projectTitle,
      aspectRatio,
      duration,
      fileSizeMb: parseFloat((videoBlob.size / (1024 * 1024)).toFixed(1)),
      videoUrl: URL.createObjectURL(videoBlob),
      createdAt: new Date().toISOString(),
      status: 'completed',
    };
    addHistoryItem(historyItem);
    setHistoryItems(getRenderHistory());
  };

  // Wizard Step Navigation
  const goToNextStep = () => {
    if (currentMode === 'audio_only') {
      if (currentStep === 'script') setCurrentStep('voice');
      return;
    }
    const order: WizardStep[] = ['script', 'format', 'subtitles', 'motion', 'voice'];
    const idx = order.indexOf(currentStep);
    if (idx < order.length - 1) {
      setCurrentStep(order[idx + 1]);
    }
  };

  const goToPrevStep = () => {
    if (currentMode === 'audio_only') {
      if (currentStep === 'voice') setCurrentStep('script');
      return;
    }
    const order: WizardStep[] = ['script', 'format', 'subtitles', 'motion', 'voice'];
    const idx = order.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(order[idx - 1]);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0B12] text-[#F4F2FF] flex flex-col font-sans selection:bg-[#8B5CF6]/30 selection:text-white">
        {/* App Header */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectTitle={projectTitle}
          onSaveProject={handleSaveCurrentProject}
          isSaving={isSaving}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'studio' && (
            <div className="space-y-6">
              {/* 1. Mode Cards Row (5 modes) */}
              <ModeCardsRow
                currentMode={currentMode}
                onModeSelect={handleModeSelect}
              />

              {/* 2. 5-step wizard pills */}
              <WizardPills
                currentStep={currentStep}
                onStepSelect={setCurrentStep}
                mode={currentMode}
                completedSteps={completedSteps}
              />

              {/* 3. Studio Layout: Two Column Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Wizard Active Step Configuration */}
                <div className="lg:col-span-7 space-y-6">
                  {currentStep === 'script' && (
                    <Step1Script
                      rawScript={rawScript}
                      onScriptChange={setRawScript}
                      scenes={scenes}
                      onScenesChange={setScenes}
                      projectTitle={projectTitle}
                      onTitleChange={setProjectTitle}
                      onNext={goToNextStep}
                      customApiKey={settings.geminiApiKey}
                      onApiKeyUpdate={handleUpdateGeminiKey}
                    />
                  )}

                  {currentStep === 'format' && (
                    <Step2Format
                      aspectRatio={aspectRatio}
                      onAspectRatioChange={setAspectRatio}
                      resolution={resolution}
                      onResolutionChange={setResolution}
                      visualType={visualType}
                      onVisualTypeChange={setVisualType}
                      template={template}
                      onTemplateChange={setTemplate}
                      onNext={goToNextStep}
                      onPrev={goToPrevStep}
                    />
                  )}

                  {currentStep === 'subtitles' && (
                    <Step3Subtitles
                      subtitles={subtitles}
                      onSubtitlesChange={setSubtitles}
                      onNext={goToNextStep}
                      onPrev={goToPrevStep}
                    />
                  )}

                  {currentStep === 'motion' && (
                    <Step4Motion
                      motion={motion}
                      onMotionChange={setMotion}
                      onNext={goToNextStep}
                      onPrev={goToPrevStep}
                    />
                  )}

                  {currentStep === 'voice' && (
                    <Step5Voice
                      voice={voice}
                      onVoiceChange={setVoice}
                      scenes={scenes}
                      onScenesChange={setScenes}
                      customGeminiKey={settings.geminiApiKey}
                      customElevenLabsKey={settings.elevenLabsApiKey}
                      onGeminiKeyUpdate={handleUpdateGeminiKey}
                      onNext={goToNextStep}
                      onPrev={goToPrevStep}
                    />
                  )}
                </div>

                {/* Right Column: Real-Time Canvas Preview & Video Renderer Engine */}
                <div className="lg:col-span-5 sticky top-20">
                  <VideoPreviewAndRender
                    projectTitle={projectTitle}
                    scenes={scenes}
                    aspectRatio={aspectRatio}
                    resolution={resolution}
                    template={template}
                    subtitles={subtitles}
                    motion={motion}
                    voice={voice}
                    onOpenFacebookModal={() => setIsFacebookModalOpen(true)}
                    onRenderComplete={handleRenderComplete}
                    onNavigateToSettings={() => setActiveTab('settings')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <ProjectsTab
              projects={projects}
              currentProjectId={currentProjectId}
              onOpenProject={handleOpenProject}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onCreateNewProject={handleCreateNewProject}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              historyItems={historyItems}
              onClearHistory={() => {
                clearRenderHistory();
                setHistoryItems([]);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>

        {/* Facebook Publish Modal */}
        <FacebookPublishModal
          isOpen={isFacebookModalOpen}
          onClose={() => setIsFacebookModalOpen(false)}
          videoTitle={projectTitle}
          videoBlob={lastRenderedBlob}
          videoFilename={lastRenderedFilename}
        />
      </div>
    </ErrorBoundary>
  );
}
