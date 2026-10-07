import React from 'react';
import { WizardStep, AppMode } from '../types';
import { Check } from 'lucide-react';

interface WizardPillsProps {
  currentStep: WizardStep;
  onStepSelect: (step: WizardStep) => void;
  mode: AppMode;
  completedSteps: Record<WizardStep, boolean>;
}

interface StepItem {
  id: WizardStep;
  number: number;
  label: string;
  sublabel: string;
}

export const WizardPills: React.FC<WizardPillsProps> = ({
  currentStep,
  onStepSelect,
  mode,
  completedSteps
}) => {
  const allSteps: StepItem[] = [
    { id: 'script', number: 1, label: '1. Script', sublabel: 'স্ক্রিপ্ট ও দৃশ্য' },
    { id: 'format', number: 2, label: '2. Format', sublabel: 'রেশিও ও সাইজ' },
    { id: 'subtitles', number: 3, label: '3. Subtitles', sublabel: 'সাবটাইটেল' },
    { id: 'motion', number: 4, label: '4. Motion', sublabel: 'ক্যামেরা মোশন' },
    { id: 'voice', number: 5, label: '5. Voice', sublabel: 'ভয়েসওভার' },
  ];

  // Adjust steps according to mode:
  // In 'audio_only' mode: Only Step 1 (Script) and Step 5 (Voice)
  const activeSteps = mode === 'audio_only'
    ? allSteps.filter(s => s.id === 'script' || s.id === 'voice')
    : allSteps;

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-none">
      <div className="flex items-center gap-2 sm:gap-3 min-w-max">
        {activeSteps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isDone = completedSteps[step.id] && !isActive;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepSelect(step.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/30 ring-2 ring-[#8B5CF6]/50'
                    : isDone
                    ? 'bg-[#14141D] text-[#DDD6FE] border border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/15'
                    : 'bg-[#14141D] text-[#A7A3C2] border border-[rgba(139,92,246,0.18)] hover:text-[#F4F2FF] hover:bg-white/5'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isDone
                    ? 'bg-[#22C55E]/20 text-[#22C55E]'
                    : 'bg-white/10 text-[#A7A3C2]'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : step.number}
                </span>
                <span className="font-semibold">{step.label}</span>
                <span className="hidden md:inline opacity-75 font-normal text-[11px]">({step.sublabel})</span>
              </button>

              {idx < activeSteps.length - 1 && (
                <div className="w-4 sm:w-6 h-[1.5px] bg-[#8B5CF6]/20 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
