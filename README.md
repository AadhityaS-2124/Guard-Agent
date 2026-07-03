# 🛡️ GuardAgent: Multi-Agent Security Remediation Engine

> **Intelligent vulnerability detection and automated code remediation powered by AI**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-121212?style=for-the-badge&logo=python&logoColor=white)](https://github.com/langchain-ai/langgraph)

---

## 🎯 Overview

**GuardAgent** is a sophisticated security platform that combines static code analysis with AI-powered remediation to automatically detect and fix security vulnerabilities in Python code. It leverages a multi-agent architecture to provide intelligent, context-aware vulnerability remediation with a self-healing validation loop.

### Key Capabilities

✅ **Automated Vulnerability Detection** - Static AST analysis identifies common security issues  
✅ **AI-Powered Remediation** - Google Gemini LLM generates secure code patches  
✅ **Self-Healing Loop** - Iterative refinement with compilation validation (max 3 iterations)  
✅ **Real-Time Streaming** - Live pipeline status and execution updates  
✅ **Interactive UI** - Modern, skeuomorphic interface with visual security insights  
✅ **Comprehensive Logging** - Detailed error tracking and refinement history  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                 │
│            Interactive Code Editor & Visualization              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP Streaming (SSE)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + LangGraph)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  AST Scan    │───→│  LLM Patch   │───→│  Validation  │       │
│  │  & Analyze   │    │  (Gemini)    │    │  (Compiler)  │       │
│  └──────────────┘    └──────────────┘    └────────┬─────┘       │
│                                                    │              │
│                              ┌─────────────────────┴──────┐       │
│                              │                            │       │
│                              ↓ (on error & max < 3)      ↓       │
│                         Loop Back          Finalize & Exit       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Processing Pipeline

1. **Scanning** 🔍 - AST-based vulnerability detection
2. **Analyzing** 📊 - Vulnerability classification and severity assessment
3. **Patching** 🔧 - LLM-powered code remediation
4. **Validating** ✓ - Native Python compilation verification
5. **Complete** ✨ - Results delivery with refinement history

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (Frontend)
- **Python** 3.11+ (Backend)
- **Google Gemini API Key** ([Get one here](https://ai.google.dev/))

### Installation & Setup

#### 1️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
export GEMINI_API_KEY="your_api_key_here"  # Or set in frontend UI

# Run the FastAPI server
python app/main.py
# Server runs at http://127.0.0.1:8000
```

#### 2️⃣ Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# UI runs at http://localhost:5173
```

#### 3️⃣ Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📋 Vulnerability Detection

GuardAgent detects the following security vulnerabilities:

| Vulnerability | Detection Method | Remediation Strategy |
|---|---|---|
| **SQL Injection** | AST pattern matching (string interpolation in queries) | Parameterized queries |
| **Command Injection** | Detection of `os.system()`, `subprocess.run(shell=True)` | Subprocess with `shell=False` + arg list |
| **Hardcoded Secrets** | String literal pattern recognition | Environment variables |
| **Eval/Exec** | Direct `eval()`, `exec()` calls | Safe parsing alternatives |
| **Insecure Deserialization** | `pickle.loads()`, `yaml.load()` detection | Secure formats (JSON) |

---

## 💻 Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Next-gen build tool
- **Lucide React** - Icon library

### Backend
- **FastAPI** - High-performance async web framework
- **Python 3.11+** - Core language
- **LangGraph** - Multi-agent orchestration
- **Google Genai SDK** - LLM integration (Gemini 2.5-Flash)
- **AST Module** - Static code analysis

### DevOps & Tools
- **Oxlint** - High-performance linter
- **Pydantic** - Data validation
- **CORS Middleware** - Cross-origin request handling
- **SSE (Server-Sent Events)** - Real-time streaming

---

## 🎮 Usage Examples

### Template 1: SQL Injection Remediation

```python
# Original Vulnerable Code
import sqlite3
def get_user_records(db_path: str, username: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchall()
```

**GuardAgent Output:**
- ✅ Detects SQL injection vulnerability
- 🔧 Patches with parameterized queries
- ✓ Validates syntax and imports

### Template 2: Command Injection Fix

```python
# Original Vulnerable Code
import subprocess
def ping_server(ip_address: str):
    command = f"ping -c 1 {ip_address}"
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return result.stdout
```

**GuardAgent Output:**
- ✅ Identifies shell=True vulnerability
- 🔧 Converts to safe subprocess list format
- ✓ Removes shell execution risk

---

## 📁 Project Structure

```
Guard-Agent/
├── frontend/                      # React + TypeScript UI
│   ├── src/
│   │   ├── App.tsx               # Main application component
│   │   ├── components/
│   │   │   ├── Stepper.tsx       # Pipeline progress visualization
│   │   │   ├── CodeViewer.tsx    # Split code comparison view
│   │   │   ├── VulnerabilityList.tsx  # Vulnerability details
│   │   │   └── RefinementHistory.tsx  # Iteration tracking
│   │   └── App.css               # Skeuomorphic styling
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                       # FastAPI + LangGraph
│   ├── app/
│   │   ├── main.py               # FastAPI server & /api/remediate endpoint
│   │   ├── ast_analyzer.py       # Vulnerability detection
│   │   └── remediation_graph.py  # LangGraph multi-agent pipeline
│   ├── requirements.txt
│   ├── test_backend.py           # Unit tests
│   └── test_adc.py
│
├── README.md                      # This file
└── .gitignore
```

---

## 🧪 Testing

### Backend Unit Tests

```bash
cd backend
python test_backend.py
```

**Expected Output:**
```
--- Testing AST Security Scanning ---
Scanned and found 5 vulnerabilities:
[HIGH] eval_exec on line 19: Eval/Exec detected
[HIGH] sql_injection on line 23: SQL Injection
[HIGH] command_injection on line 26: Command Injection
...
AST Scanner Test: SUCCESS

--- Testing LangGraph Pipeline Compilation ---
LangGraph Compilation Test: SUCCESS

All backend checks passed successfully!
```

---

## 🌐 API Reference

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### Remediate Code

```http
POST /api/remediate
Content-Type: application/json

{
  "code": "import sqlite3\ndef get_user(username):\n    cursor.execute(f\"SELECT * FROM users WHERE name = '{username}'\")",
  "api_key": "your_gemini_api_key_here"  // Optional (uses env var if not provided)
}
```

**Response:** Server-Sent Events (streaming JSON)
```json
{
  "original_code": "...",
  "patched_code": "...",
  "vulnerabilities": [...],
  "error_logs": [...],
  "iteration_count": 1,
  "pipeline_step": "analyzing",
  "history": [...],
  "compile_success": false,
  "error_message": null
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Backend (.env or system variables)
GEMINI_API_KEY=your_api_key_here
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Frontend (.env.local)
VITE_API_URL=http://127.0.0.1:8000
```

### LLM Model Configuration

Edit `backend/app/remediation_graph.py` to change the model:

```python
# Current default: gemini-2.5-flash
response = client.models.generate_content(
    model='gemini-2.5-flash',  # ← Change model here
    contents=prompt,
)
```

---

## 🔐 Security Considerations

- **API Keys**: Never hardcode Gemini API keys; use environment variables
- **CORS**: Configure `allow_origins` for production deployments
- **Input Validation**: All code submissions validated via Pydantic models
- **Rate Limiting**: Consider adding rate limiting for production
- **Code Execution**: No direct code execution; only syntax validation via `compile()`

---

## 🤝 Contributing

Contributions are welcome! Areas for enhancement:

- [ ] Support for JavaScript/TypeScript vulnerability detection
- [ ] Extended vulnerability taxonomy
- [ ] Custom LLM model integration
- [ ] Persistent result storage & database
- [ ] GitHub Actions integration
- [ ] Performance benchmarking suite
- [ ] Docker containerization

---

## 📊 Performance Insights

| Metric | Typical Value |
|--------|---------------|
| **AST Analysis Time** | 50-100ms |
| **LLM Patching Time** | 2-5s (Gemini 2.5-Flash) |
| **Compilation Validation** | 10-50ms |
| **Max Refinement Iterations** | 3 |
| **Average Total Runtime** | 3-8s |

---

## 🎨 UI Features

- **Skeuomorphic Design** - macOS/Windows-inspired aesthetic
- **Real-Time Pipeline Visualization** - Step-by-step progress tracking
- **Split Code View** - Side-by-side original vs. patched code
- **Vulnerability Highlighting** - Interactive vulnerability markers
- **Refinement History** - Detailed iteration tracking with error logs
- **Responsive Layout** - Optimized for desktop viewing

---

## 📝 License

This project is open source and available for educational and research purposes.

---

## 🚀 Roadmap

- **v1.1** - Multi-language support (JavaScript, Java, Go)
- **v1.2** - Docker deployment with docker-compose
- **v1.3** - GitHub integration & CI/CD plugins
- **v2.0** - Advanced dataflow analysis & taint tracking

---

## 💡 Tips & Tricks

1. **Demo Mode**: Leave API key blank to see hardcoded examples
2. **Custom Code**: Edit the Python code textarea directly
3. **Error Analysis**: Check the "Instrumentation" panel for refinement details
4. **Syntax Learning**: Each iteration shows compiler feedback

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub or contact the maintainers.

---

<div align="center">

**Made with ❤️ by GuardAgent Team**

[⬆ Back to Top](#-guardagent-multi-agent-security-remediation-engine)

</div>
