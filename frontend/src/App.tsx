import { useState } from "react";
import { 
  Shield, 
  Play, 
  Terminal, 
  Key, 
  Layers, 
  AlertTriangle, 
  Cpu, 
  CheckCircle,
  FileCode,
  Info,
  Eye,
  EyeOff,
  Trash2
} from "lucide-react";
import { Stepper } from "./components/Stepper";
import { CodeViewer } from "./components/CodeViewer";
import { VulnerabilityList } from "./components/VulnerabilityList";
import type { Vulnerability } from "./components/VulnerabilityList";
import { RefinementHistory } from "./components/RefinementHistory";
import type { RefinementEntry } from "./components/RefinementHistory";

// Predefined code templates for users to test
const CODE_TEMPLATES = {
  sql_injection: `import sqlite3

def get_user_records(db_path: str, username: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # VULNERABILITY: f-string string format leads to SQL Injection
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchall()`,

  command_injection: `import subprocess

def ping_server(ip_address: str):
    # VULNERABILITY: shell=True with unvalidated variable allows remote command execution
    command = f"ping -c 1 {ip_address}"
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return result.stdout`,

  hardcoded_secret: `import stripe

# VULNERABILITY: Hardcoded Stripe API Key exposed in source code
STRIPE_API_KEY = "sk_test_51N8xJyG2c8LmqR3xSecretAPIKey998822"

def charge_customer(amount: int, token: str):
    stripe.api_key = STRIPE_API_KEY
    charge = stripe.Charge.create(
        amount=amount,
        currency="usd",
        source=token,
        description="Service Charge"
    )
    return charge.id`,

  compilation_failure: `import os

def scan_network_hosts(host_ip: str):
    # VULNERABILITY: Command injection risk using os.system
    # SYNTAX ERROR: Intentional missing parenthesis in print statement to trigger self-healing refinement loop
    print(f"Scanning target host: {host_ip}"
    os.system("nmap -sV " + host_ip)
`
};

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("sql_injection");
  const [inputCode, setInputCode] = useState<string>(CODE_TEMPLATES.sql_injection);
  const [apiKey, setApiKey] = useState<string>(() => sessionStorage.getItem("gemini_api_key") || "");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    sessionStorage.setItem("gemini_api_key", val);
  };

  const clearApiKey = () => {
    setApiKey("");
    sessionStorage.removeItem("gemini_api_key");
  };

  // Pipeline execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [originalCode, setOriginalCode] = useState<string>("");
  const [patchedCode, setPatchedCode] = useState<string>("");
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [iterationCount, setIterationCount] = useState<number>(0);
  const [pipelineStep, setPipelineStep] = useState<
    "scanning" | "analyzing" | "patching" | "validating" | "complete"
  >("complete");
  const [history, setHistory] = useState<RefinementEntry[]>([]);
  const [compileSuccess, setCompileSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Interaction state
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    setInputCode(CODE_TEMPLATES[templateName as keyof typeof CODE_TEMPLATES]);
  };

  const startRemediation = async () => {
    if (!inputCode.trim()) return;

    setIsRunning(true);
    setErrorMessage(null);
    setOriginalCode(inputCode);
    setPatchedCode("");
    setVulnerabilities([]);
    setErrorLogs([]);
    setIterationCount(0);
    setHistory([]);
    setCompileSuccess(false);
    setSelectedLine(null);
    setPipelineStep("scanning");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/remediate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: inputCode,
          api_key: apiKey ? apiKey : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server connection failed: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Unable to read execution stream from FastAPI server.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr) {
              const stateUpdate = JSON.parse(dataStr);
              
              setPipelineStep(stateUpdate.pipeline_step);
              setPatchedCode(stateUpdate.patched_code);
              setVulnerabilities(stateUpdate.vulnerabilities);
              setErrorLogs(stateUpdate.error_logs);
              setIterationCount(stateUpdate.iteration_count);
              setHistory(stateUpdate.history);
              setCompileSuccess(stateUpdate.compile_success);
              
              if (stateUpdate.error_message) {
                setErrorMessage(stateUpdate.error_message);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during execution.");
      setPipelineStep("complete");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-grid pb-12 select-none">
      {/* Spatial Header Panel */}
      <header className="border-b border-white/5 bg-[#070b13]/60 backdrop-blur-xl sticky top-0 z-30 shadow-[0_1px_10px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/15 rounded-xl">
              <Shield className="w-5.5 h-5.5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold font-outfit tracking-wide bg-gradient-to-r from-indigo-200 via-purple-300 to-pink-200 bg-clip-text text-transparent">
                GuardAgent Multi-Agent Remediation
              </h1>
              <p className="text-[10px] text-gray-500 font-light mt-0.5">
                Skeuomorphic Spatial Security Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono bg-black/50 border border-white/5 rounded-lg px-3 py-1.5 shadow-inner">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] tracking-wide font-medium">Intel i7 Async Engine</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/20 border border-rose-500/25 rounded-2xl flex items-start gap-3 shadow-lg select-text">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-sm font-semibold text-rose-300">Pipeline execution interrupted</span>
              <p className="text-xs text-rose-400/90 font-mono mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Stepper display */}
        {(isRunning || originalCode) && (
          <Stepper currentStep={pipelineStep} errorOccurred={!!errorMessage} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Target Code Selector & Input Card */}
            <div className="spatial-plate p-5 space-y-4 bg-slate-950/40">
              {/* Window controls */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="win-btn win-btn-close" />
                  <div className="win-btn win-btn-minimize" />
                  <div className="win-btn win-btn-maximize" />
                </div>
                <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase font-outfit">
                  Source Panel
                </h2>
                <div className="w-10" />
              </div>

              {/* Template dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Vulnerability Template</label>
                <div className="skeuo-well p-1.5">
                  <select
                    disabled={isRunning}
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full bg-transparent border-0 rounded-lg px-2 py-1 text-xs font-semibold text-gray-300 focus:outline-none focus:ring-0 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="sql_injection">SQL Injection (f-string query)</option>
                    <option value="command_injection">Command Injection (shell=True)</option>
                    <option value="hardcoded_secret">Hardcoded Stripe Secret</option>
                    <option value="compilation_failure">Syntax Error + Command Injection (Self-Healing)</option>
                  </select>
                </div>
              </div>

              {/* API Key overrides */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <Key className="w-3 h-3 text-indigo-400" />
                    Gemini API Key
                  </label>
                  <span className="text-[9px] text-gray-500 font-light">Overrides env</span>
                </div>
                <div className="skeuo-well p-1 flex items-center gap-1.5 pr-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    disabled={isRunning}
                    placeholder="Enter API key..."
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="flex-1 bg-transparent border-0 rounded-lg px-2 py-1 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-0"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={clearApiKey}
                      disabled={isRunning}
                      title="Clear API Key"
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={isRunning}
                    title={showApiKey ? "Hide Key" : "Show Key"}
                    className="text-gray-500 hover:text-indigo-400 transition-colors p-1 cursor-pointer flex items-center justify-center"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 leading-tight">
                  This key is stored locally in temporary session memory and is never shared with third parties.
                </p>
              </div>

              {/* Raw code text area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Raw Python Code Editor</label>
                <div className="skeuo-well p-2 relative">
                  <textarea
                    disabled={isRunning}
                    rows={12}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="w-full bg-transparent border-0 rounded-lg p-2 text-xs font-mono text-gray-300 focus:outline-none focus:ring-0 resize-y leading-relaxed"
                  />
                  <div className="absolute right-3.5 bottom-3.5 px-2 py-0.5 bg-black border border-white/5 rounded text-[8px] font-bold tracking-wider text-gray-600 select-none uppercase font-outfit">
                    PYTHON 3.11+
                  </div>
                </div>
              </div>

              {/* Raised physical mechanical button */}
              <button
                disabled={isRunning || !inputCode.trim()}
                onClick={startRemediation}
                className="w-full skeuo-button-primary text-white font-bold rounded-xl py-2.5 px-4 text-xs flex items-center justify-center gap-2 select-none"
              >
                {isRunning ? (
                  <>
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>ENGINE RUNNING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>RUN PIPELINE SWITCH</span>
                  </>
                )}
              </button>
            </div>

            {/* Pipeline Statistics/Meta panel */}
            {(originalCode || isRunning) && (
              <div className="spatial-plate p-5 space-y-4 bg-slate-950/40">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="win-btn win-btn-close" />
                    <div className="win-btn win-btn-minimize" />
                    <div className="win-btn win-btn-maximize" />
                  </div>
                  <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase font-outfit">
                    Instrumentation
                  </h2>
                  <div className="w-10" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="skeuo-well p-3.5">
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold font-outfit">
                      Refinements
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-indigo-400 mt-1 block">
                      {iterationCount}/3
                    </span>
                  </div>
                  <div className="skeuo-well p-3.5">
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold font-outfit">
                      Status Valve
                    </span>
                    {compileSuccess ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded mt-2.5 inline-block">
                        VALIDATED
                      </span>
                    ) : isRunning ? (
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 px-2 py-0.5 rounded mt-2.5 inline-block animate-pulse">
                        VALIDATING
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/30 border border-rose-500/20 px-2 py-0.5 rounded mt-2.5 inline-block">
                        UNVERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results/Comparison Column (Right) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Refinement History (Only if > 0 attempts exist) */}
            <RefinementHistory history={history} />

            {/* Split Code View & Vulnerability lists */}
            {originalCode ? (
              <div className="space-y-6">
                
                {/* code comparison split viewport */}
                <CodeViewer
                  originalCode={originalCode}
                  patchedCode={patchedCode}
                  vulnerabilities={vulnerabilities}
                  selectedLine={selectedLine}
                  onSelectLine={setSelectedLine}
                  isPatching={pipelineStep === "patching" && isRunning}
                  compileSuccess={compileSuccess}
                />

                {/* Vulnerability list panel */}
                <VulnerabilityList
                  vulnerabilities={vulnerabilities}
                  selectedLine={selectedLine}
                  onSelectLine={setSelectedLine}
                />
              </div>
            ) : (
              /* Spatial Idle view screen */
              <div className="spatial-plate p-10 flex flex-col items-center justify-center text-center h-[520px] bg-slate-950/40">
                {/* Decoration control dots */}
                <div className="absolute top-4 left-5 flex items-center gap-1.5 select-none">
                  <div className="win-btn win-btn-close" />
                  <div className="win-btn win-btn-minimize" />
                  <div className="win-btn win-btn-maximize" />
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl mb-4 shadow-xl">
                  <Shield className="w-11 h-11 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold font-outfit text-gray-200">
                  Ready for Inspection
                </h3>
                <p className="text-xs text-gray-400 max-w-xs mt-2 leading-relaxed font-light">
                  Select a template or write Python code in the left editor panel, then trigger the remediation switch.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
                  <div className="flex items-center gap-3 text-left p-3 bg-black/30 border border-white/5 rounded-xl shadow-md">
                    <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-gray-300 block font-outfit">AST Scanner</span>
                      <span className="text-[9px] text-gray-500">Statically audits syntactic structures.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-left p-3 bg-black/30 border border-white/5 rounded-xl shadow-md">
                    <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-gray-300 block font-outfit">Compiler Valve</span>
                      <span className="text-[9px] text-gray-500">Runs native check validation.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Inline Spinner icon
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
