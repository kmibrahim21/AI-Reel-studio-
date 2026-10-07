import React from 'react';

interface InlineGeminiKeyBoxProps {
  currentKey?: string;
  onKeySaved?: (newKey: string) => void;
  autoFocus?: boolean;
}

/**
 * In AI Studio, Gemini API keys are securely managed server-side via environment variables.
 * No user-facing API key input is required.
 */
export const InlineGeminiKeyBox: React.FC<InlineGeminiKeyBoxProps> = () => {
  return null;
};
