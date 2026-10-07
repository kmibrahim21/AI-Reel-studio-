import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ReelStudio:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B12] text-[#F4F2FF] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#14141D] border border-[#8B5CF6]/30 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">সাময়িক কারিগরি ত্রুটি</h2>
            <p className="text-xs text-[#A7A3C2] mb-4">
              একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।
            </p>
            {this.state.error && (
              <div className="p-3 mb-4 rounded-xl bg-[#0B0B12] border border-[#8B5CF6]/20 text-left font-mono text-[11px] text-[#DDD6FE] overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-semibold flex items-center justify-center gap-2 mx-auto active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>পেজ রিফ্রেশ করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
