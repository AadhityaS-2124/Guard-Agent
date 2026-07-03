import React from "react";
import { Search, ShieldAlert, Cpu, CheckCircle, ShieldCheck } from "lucide-react";

interface StepperProps {
  currentStep: "scanning" | "analyzing" | "patching" | "validating" | "complete";
  errorOccurred: boolean;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, errorOccurred }) => {
  const steps = [
    {
      id: "scanning",
      label: "Scanning",
      description: "AST Inspection",
      icon: Search,
    },
    {
      id: "analyzing",
      label: "Analyzing",
      description: "Flagging Risks",
      icon: ShieldAlert,
    },
    {
      id: "patching",
      label: "Patching",
      description: "Gemini Synthesis",
      icon: Cpu,
    },
    {
      id: "validating",
      label: "Validating",
      description: "Syntax Compile",
      icon: ShieldCheck,
    },
    {
      id: "complete",
      label: "Complete",
      description: "Ready & Verified",
      icon: CheckCircle,
    },
  ];

  const getStepIndex = (step: string) => {
    return steps.findIndex((s) => s.id === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full py-5 px-6 spatial-plate mb-6">
      {/* Title with window control dots */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5 select-none">
        <div className="flex items-center gap-1.5">
          <div className="win-btn win-btn-close" />
          <div className="win-btn win-btn-minimize" />
          <div className="win-btn win-btn-maximize" />
        </div>
        <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase font-outfit">
          Pipeline Controller Console
        </span>
        <div className="w-14" /> {/* Spacer */}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-5 md:gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex || currentStep === "complete";
          const isActive = idx === currentIndex && currentStep !== "complete";
          const isPending = idx > currentIndex && currentStep !== "complete";

          let stepColorClass = "text-gray-500 border-white/5 bg-gray-950/40";
          let textColorClass = "text-gray-500";
          let ledClass = "led-off";

          if (isCompleted) {
            stepColorClass = "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
            textColorClass = "text-emerald-400/90";
            ledClass = "led-green";
          } else if (isActive) {
            if (errorOccurred) {
              stepColorClass = "text-rose-400 border-rose-500/20 bg-rose-950/20 animate-pulse";
              textColorClass = "text-rose-400";
              ledClass = "led-red";
            } else {
              stepColorClass = "text-indigo-400 border-indigo-500/20 bg-indigo-950/20 border-[1.5px]";
              textColorClass = "text-indigo-200 font-semibold";
              ledClass = "led-blue animate-pulse";
            }
          }

          return (
            <React.Fragment key={step.id}>
              {/* Step module */}
              <div className="flex items-center gap-3.5 flex-1 justify-between md:justify-start w-full md:w-auto relative z-10">
                <div className="flex items-center gap-3">
                  {/* Glowing physical LED indicator */}
                  <div className={`led-indicator ${ledClass}`} />

                  {/* Icon Circle */}
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-300 ${stepColorClass}`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Step metadata */}
                  <div className="flex flex-col text-left">
                    <span className={`text-[13px] font-semibold ${textColorClass} transition-colors duration-300 font-outfit`}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-gray-500 font-light truncate max-w-[110px] hidden sm:inline font-sans">
                      {step.description}
                    </span>
                  </div>
                </div>

                {/* Horizontal flow line for desktops */}
                {idx < steps.length - 1 && (
                  <div
                    className={`hidden md:block absolute left-[125px] top-1/2 h-[1px] w-[calc(100%-110px)] -translate-y-1/2 -z-10 transition-all duration-500 ${
                      isCompleted ? "bg-emerald-500/30" : "bg-white/5"
                    }`}
                  />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
