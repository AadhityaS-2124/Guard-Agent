import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, RefreshCw, Code2 } from "lucide-react";

export interface RefinementEntry {
  iteration: number;
  code: string;
  error: string;
}

interface RefinementHistoryProps {
  history: RefinementEntry[];
}

export const RefinementHistory: React.FC<RefinementHistoryProps> = ({ history }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!history || history.length === 0) return null;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="w-full spatial-plate p-5 border-amber-500/20 mb-6 bg-amber-950/5">
      {/* Window Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5 select-none">
        <div className="flex items-center gap-1.5">
          <div className="win-btn win-btn-close" />
          <div className="win-btn win-btn-minimize" />
          <div className="win-btn win-btn-maximize" />
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span className="text-xs font-bold tracking-wider text-amber-300 uppercase font-outfit">
            Self-Healing Refinement Log ({history.length})
          </span>
        </div>
        <div className="w-14" /> {/* Spacer */}
      </div>

      <div className="space-y-3">
        {history.map((entry, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div
              key={idx}
              className="border border-white/5 bg-black/30 rounded-xl overflow-hidden transition-all duration-200"
            >
              {/* Collapsible header */}
              <button
                onClick={() => toggleExpand(idx)}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 bg-amber-950/20 border border-amber-800/20 rounded-lg">
                    <span className="text-xs font-bold text-amber-400 font-mono">#{entry.iteration}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-300 font-outfit">
                      Loop #{entry.iteration} Syntax Validation Checked
                    </span>
                    <p className="text-[10px] text-rose-400/90 font-mono mt-0.5 truncate max-w-[280px] sm:max-w-md md:max-w-xl">
                      {entry.error.split("\n")[0]}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Collapsible content */}
              {isExpanded && (
                <div className="p-4 border-t border-white/5 bg-black/60 space-y-3.5">
                  {/* Compiler error block */}
                  <div className="p-3 bg-rose-950/10 border border-rose-900/20 rounded-lg flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                        Syntax Compiler Feedback
                      </span>
                      <pre className="text-xs text-rose-200/90 font-mono mt-1.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {entry.error}
                      </pre>
                    </div>
                  </div>

                  {/* Code attempt */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-500 px-1">
                      <Code2 className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider font-outfit">
                        Draft Attempt Code Block
                      </span>
                    </div>
                    <div className="skeuo-well p-3 overflow-x-auto">
                      <pre className="text-[11px] text-gray-400 font-mono max-h-[160px]">
                        <code>{entry.code}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
