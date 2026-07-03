import React from "react";
import { AlertCircle, Check, ArrowRight } from "lucide-react";
import type { Vulnerability } from "./VulnerabilityList";

interface CodeViewerProps {
  originalCode: string;
  patchedCode: string;
  vulnerabilities: Vulnerability[];
  selectedLine: number | null;
  onSelectLine: (line: number | null) => void;
  isPatching: boolean;
  compileSuccess: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  originalCode,
  patchedCode,
  vulnerabilities,
  selectedLine,
  onSelectLine,
  isPatching,
  compileSuccess,
}) => {
  const originalLines = originalCode.split("\n");
  const patchedLines = (patchedCode || originalCode).split("\n");

  // Map vulnerability lines for quick lookup
  const vulnMap = vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.line] = vuln;
    return acc;
  }, {} as Record<number, Vulnerability>);

  // Render a side of the code split panel
  const renderCodePanel = (
    title: string,
    lines: string[],
    isOriginal: boolean,
    badgeText?: string,
    badgeColor?: string
  ) => {
    return (
      <div className="flex-1 flex flex-col min-w-[320px] spatial-plate overflow-hidden bg-slate-950/40">
        {/* Spatial Window Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/3 border-b border-white/5 select-none">
          {/* macOS Style Window controls */}
          <div className="flex items-center gap-1.5">
            <div className="win-btn win-btn-close" />
            <div className="win-btn win-btn-minimize" />
            <div className="win-btn win-btn-maximize" />
          </div>
          
          <span className="text-xs font-semibold font-outfit text-gray-400 tracking-wide">{title}</span>
          
          {badgeText && (
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${badgeColor}`}>
              {badgeText}
            </span>
          )}
        </div>

        {/* Code Content Well */}
        <div className="flex-1 p-3.5 bg-transparent">
          <div className="w-full h-full skeuo-well p-3 overflow-auto max-h-[480px] font-mono text-[13px] leading-relaxed select-text">
            <div className="min-w-max">
              {lines.map((lineContent, idx) => {
                const lineNum = idx + 1;
                const hasVuln = isOriginal && vulnMap[lineNum];
                const isLineSelected = isOriginal && selectedLine === lineNum;
                
                let lineBg = "hover:bg-white/3";
                let lineNumColor = "text-gray-600";
                let codeColor = "text-gray-300";
                
                if (hasVuln) {
                  lineBg = isLineSelected 
                    ? "code-highlight-vuln bg-rose-950/30 border-l-[3.5px] border-rose-500" 
                    : "code-highlight-vuln bg-rose-950/15 border-l-[3.5px] border-rose-500/30 hover:bg-rose-950/20";
                  lineNumColor = "text-rose-400 font-bold";
                  codeColor = "text-rose-200";
                } else if (!isOriginal && patchedCode && patchedCode !== originalCode) {
                  // If it is the patched side and content actually changed, color it green
                  const origLine = originalLines[idx];
                  if (origLine !== lineContent) {
                    lineBg = "code-highlight-fixed bg-emerald-950/10 border-l-[3.5px] border-emerald-500/30 hover:bg-emerald-950/15";
                    lineNumColor = "text-emerald-400 font-bold";
                    codeColor = "text-emerald-100";
                  }
                }

                return (
                  <div
                    key={idx}
                    onClick={() => hasVuln && onSelectLine(isLineSelected ? null : lineNum)}
                    className={`flex items-start py-0.5 group transition-colors duration-150 relative ${lineBg} ${
                      hasVuln ? "cursor-pointer" : ""
                    }`}
                  >
                    {/* Line Number */}
                    <span className={`w-10 select-none text-right pr-4 shrink-0 font-mono text-xs ${lineNumColor}`}>
                      {lineNum}
                    </span>

                    {/* Code Line */}
                    <span className={`whitespace-pre pr-4 font-mono ${codeColor}`}>
                      {lineContent || " "}
                    </span>

                    {/* Tooltip detail block */}
                    {hasVuln && isLineSelected && (
                      <div className="absolute left-10 top-full mt-1.5 z-20 max-w-sm p-4 spatial-plate border-rose-500/30 bg-rose-950/95 text-rose-200 rounded-xl shadow-2xl text-xs font-sans">
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <AlertCircle className="w-4.5 h-4.5 text-rose-400" />
                          <span className="capitalize">{vulnMap[lineNum].type.replace("_", " ")}</span>
                        </div>
                        <p className="font-light text-rose-300/90 leading-relaxed">
                          {vulnMap[lineNum].description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Determine patched side badge
  let patchBadge = "Waiting";
  let patchBadgeColor = "bg-white/5 text-gray-500 border-white/5";
  if (isPatching) {
    patchBadge = "Re-Synthesizing...";
    patchBadgeColor = "bg-indigo-950/20 text-indigo-300 border-indigo-500/20 animate-pulse";
  } else if (patchedCode && patchedCode !== originalCode) {
    if (compileSuccess) {
      patchBadge = "PASS (Compiled)";
      patchBadgeColor = "bg-emerald-950/20 text-emerald-300 border-emerald-500/25";
    } else {
      patchBadge = "FAIL (Syntax Error)";
      patchBadgeColor = "bg-rose-950/20 text-rose-300 border-rose-500/25";
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        {renderCodePanel(
          "Original Source Code",
          originalLines,
          true,
          vulnerabilities.length > 0 ? `${vulnerabilities.length} Flaws` : "Clean",
          vulnerabilities.length > 0 ? "bg-rose-950/20 text-rose-400 border-rose-500/25" : "bg-emerald-950/20 text-emerald-400 border-emerald-500/25"
        )}

        <div className="hidden lg:flex items-center justify-center text-gray-600 shrink-0">
          <ArrowRight className="w-5 h-5 text-indigo-500/40" />
        </div>

        {renderCodePanel(
          "Patched Secure Code",
          patchedLines,
          false,
          patchBadge,
          patchBadgeColor
        )}
      </div>
      {vulnerabilities.length > 0 && (
        <p className="text-[10px] text-indigo-400/60 text-right select-none font-light italic px-2 font-outfit">
          💡 Click a highlighted line in the original code to inspect the vulnerability details.
        </p>
      )}
    </div>
  );
};
